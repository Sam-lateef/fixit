import type { Post, Shop, User, District } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import {
  isCatchAllCategory,
  normTag,
  PARTS_CATEGORY_SLUGS,
  REPAIR_CATEGORY_SLUGS,
} from "./feed-filter.js";
import { haversineKm } from "./haversine.js";
import { sendPush } from "./fcm.js";
import {
  pushNewRequestNearYou,
  pushTowingNearby,
  resolvePushLocale,
} from "./push-i18n.js";

const BATCH_MS = 15 * 60 * 1000;

type ShopWithUser = Shop & { user: User & { district: District | null } };

export async function notifyShopsNewPost(post: Post): Promise<void> {
  if (post.serviceType === "TOWING") {
    await notifyTowingShops(post);
    return;
  }
  await notifyRepairPartsBatched(post);
}

async function notifyTowingShops(post: Post): Promise<void> {
  if (!post.lat || !post.lng) return;
  const isMoto = post.vehicleType === "MOTORCYCLE";
  const shops = await prisma.shop.findMany({
    where: {
      offersTowing: true,
      user: { fcmToken: { not: null } },
      ...(isMoto
        ? { servicesMotorcycles: true }
        : { servicesCars: true }),
    },
    include: { user: { include: { district: true } } },
  });
  for (const shop of shops) {
    const d = shop.user.district;
    const hasPin =
      shop.user.workshopLat != null &&
      shop.user.workshopLng != null &&
      Number.isFinite(shop.user.workshopLat) &&
      Number.isFinite(shop.user.workshopLng);
    if (!hasPin && !d) continue;
    const from = hasPin
      ? { lat: shop.user.workshopLat as number, lng: shop.user.workshopLng as number }
      : { lat: d!.lat, lng: d!.lng };
    const dist = haversineKm(from, { lat: post.lat, lng: post.lng });
    if (dist <= shop.towingRadiusKm && shop.user.fcmToken) {
      const loc = resolvePushLocale(shop.user.preferredLocale);
      const copy = pushTowingNearby(loc, dist.toFixed(1));
      await sendPush(
        shop.user.fcmToken,
        copy.title,
        copy.body,
        { postId: post.id, type: "TOWING" },
        true,
      );
    }
  }
}

async function notifyRepairPartsBatched(post: Post): Promise<void> {
  const isMoto = post.vehicleType === "MOTORCYCLE";
  const serviceWhere =
    post.serviceType === "REPAIR"
      ? { offersRepair: true as const }
      : { offersParts: true as const };
  const shops = await prisma.shop.findMany({
    where: {
      user: { fcmToken: { not: null } },
      ...serviceWhere,
      ...(isMoto
        ? { servicesMotorcycles: true }
        : { servicesCars: true }),
    },
    include: { user: { include: { district: true } } },
  });

  const eligible: ShopWithUser[] = [];
  for (const s of shops) {
    if (await shopShouldSeePost(s, post)) eligible.push(s);
  }

  const now = new Date();
  for (const shop of eligible) {
    if (!shop.user.fcmToken) continue;
    const batch = await prisma.shopNotifyBatch.findUnique({
      where: { shopId: shop.id },
    });
    if (batch && now.getTime() - batch.lastSentAt.getTime() < BATCH_MS) {
      continue;
    }
    await prisma.shopNotifyBatch.upsert({
      where: { shopId: shop.id },
      create: { shopId: shop.id, lastSentAt: now },
      update: { lastSentAt: now },
    });
    const loc = resolvePushLocale(shop.user.preferredLocale);
    const copy = pushNewRequestNearYou(loc);
    await sendPush(
      shop.user.fcmToken,
      copy.title,
      copy.body,
      { postId: post.id, type: post.serviceType },
      false,
    );
  }
}

async function shopShouldSeePost(
  shop: ShopWithUser,
  post: Post,
): Promise<boolean> {
  if (post.serviceType === "REPAIR" && !shop.offersRepair) return false;
  if (post.serviceType === "PARTS" && !shop.offersParts) return false;

  // Vehicle-type gates: shop opts in to cars (default) and / or motorcycles.
  const isMoto = post.vehicleType === "MOTORCYCLE";
  if (isMoto && !shop.servicesMotorcycles) return false;
  if (!isMoto && !shop.servicesCars) return false;

  if (!isMoto && post.carMake && shop.carMakes.length > 0) {
    const shopMakes = shop.carMakes.map(normTag);
    if (!shopMakes.includes(normTag(post.carMake))) return false;
  }
  if (!isMoto && post.carYear) {
    if (shop.carYearMin && post.carYear < shop.carYearMin) return false;
    if (shop.carYearMax && post.carYear > shop.carYearMax) return false;
  }
  if (!isMoto && post.serviceType === "REPAIR" && post.repairCategory) {
    const shopCats = shop.repairCategories.map(normTag);
    const matched = isCatchAllCategory(post.repairCategory, REPAIR_CATEGORY_SLUGS)
      ? shopCats.includes("other")
      : shopCats.includes(normTag(post.repairCategory));
    if (!matched) return false;
  }
  if (!isMoto && post.serviceType === "PARTS" && post.partsCategory) {
    const shopCats = shop.partsCategories.map(normTag);
    const matched = isCatchAllCategory(post.partsCategory, PARTS_CATEGORY_SLUGS)
      ? shopCats.includes("other")
      : shopCats.includes(normTag(post.partsCategory));
    if (!matched) return false;
  }
  if (post.serviceType === "PARTS" && shop.partsNationwide) return true;

  const shopDistrict = shop.user.district;
  if (!post.lat || !post.lng || !shopDistrict) return true;

  const dist = haversineKm(
    { lat: shopDistrict.lat, lng: shopDistrict.lng },
    { lat: post.lat, lng: post.lng },
  );
  const radius =
    post.serviceType === "REPAIR"
      ? shop.repairRadiusKm
      : shop.partsRadiusKm;
  return dist <= radius;
}
