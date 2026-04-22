import type { Post, Shop, User, District } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { haversineKm } from "./haversine.js";
import { sendPush } from "./fcm.js";

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
  const shops = await prisma.shop.findMany({
    where: { offersTowing: true, user: { fcmToken: { not: null } } },
    include: { user: { include: { district: true } } },
  });
  for (const shop of shops) {
    const d = shop.user.district;
    if (!d) continue;
    const dist = haversineKm(
      { lat: d.lat, lng: d.lng },
      { lat: post.lat, lng: post.lng },
    );
    if (dist <= shop.towingRadiusKm && shop.user.fcmToken) {
      await sendPush(
        shop.user.fcmToken,
        "Urgent towing needed nearby",
        `Someone needs a tow in your area — ${dist.toFixed(1)} km from you`,
        { postId: post.id, type: "TOWING" },
        true,
      );
    }
  }
}

async function notifyRepairPartsBatched(post: Post): Promise<void> {
  const serviceWhere =
    post.serviceType === "REPAIR"
      ? { offersRepair: true as const }
      : { offersParts: true as const };
  const shops = await prisma.shop.findMany({
    where: {
      user: { fcmToken: { not: null } },
      ...serviceWhere,
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
    await sendPush(
      shop.user.fcmToken,
      "New request near you",
      "A customer posted a new job that may match your shop.",
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

  if (post.carMake && shop.carMakes.length > 0) {
    if (!shop.carMakes.includes(post.carMake)) return false;
  }
  if (post.carYear) {
    if (shop.carYearMin && post.carYear < shop.carYearMin) return false;
    if (shop.carYearMax && post.carYear > shop.carYearMax) return false;
  }
  if (post.serviceType === "REPAIR" && post.repairCategory) {
    if (!shop.repairCategories.includes(post.repairCategory)) return false;
  }
  if (post.serviceType === "PARTS" && post.partsCategory) {
    if (!shop.partsCategories.includes(post.partsCategory)) return false;
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
