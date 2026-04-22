import type { Bid, District, Post, Shop, User } from "@prisma/client";
import { haversineKm } from "./haversine.js";

export type PostForFeed = Post & {
  district: District | null;
  user: User;
  bids: Bid[];
};

export type ShopForFeed = Shop & {
  user: User & { district: District | null };
};

export type FeedEntry = PostForFeed & { distanceKm: number | null };

/**
 * Server-side shop feed filter (guide Section 11).
 */
export function filterPostsForShop(
  shop: ShopForFeed,
  posts: PostForFeed[],
): FeedEntry[] {
  const shopDistrict = shop.user.district;
  const results: FeedEntry[] = [];

  for (const post of posts) {
    if (post.category !== shop.category) continue;
    if (post.serviceType === "REPAIR" && !shop.offersRepair) continue;
    if (post.serviceType === "PARTS" && !shop.offersParts) continue;
    if (post.serviceType === "TOWING" && !shop.offersTowing) continue;

    if (post.carMake && shop.carMakes.length > 0) {
      if (!shop.carMakes.includes(post.carMake)) continue;
    }

    if (post.carYear) {
      if (shop.carYearMin && post.carYear < shop.carYearMin) continue;
      if (shop.carYearMax && post.carYear > shop.carYearMax) continue;
    }

    if (post.serviceType === "REPAIR" && post.repairCategory) {
      if (!shop.repairCategories.includes(post.repairCategory)) continue;
    }
    if (post.serviceType === "PARTS" && post.partsCategory) {
      if (!shop.partsCategories.includes(post.partsCategory)) continue;
    }

    if (post.serviceType === "PARTS" && shop.partsNationwide) {
      results.push({ ...post, distanceKm: null });
      continue;
    }

    if (!post.lat || !post.lng || !shopDistrict) {
      results.push({ ...post, distanceKm: null });
      continue;
    }

    const dist = haversineKm(
      { lat: shopDistrict.lat, lng: shopDistrict.lng },
      { lat: post.lat, lng: post.lng },
    );

    const radius =
      post.serviceType === "REPAIR"
        ? shop.repairRadiusKm
        : post.serviceType === "PARTS"
          ? shop.partsRadiusKm
          : shop.towingRadiusKm;

    if (dist > radius) continue;

    results.push({ ...post, distanceKm: parseFloat(dist.toFixed(1)) });
  }

  results.sort((a, b) => {
    if (a.serviceType === "TOWING" && b.serviceType !== "TOWING") return -1;
    if (b.serviceType === "TOWING" && a.serviceType !== "TOWING") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return results;
}
