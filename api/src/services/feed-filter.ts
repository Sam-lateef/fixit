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

export function sortFeedEntries(a: FeedEntry, b: FeedEntry): number {
  if (a.serviceType === "TOWING" && b.serviceType !== "TOWING") return -1;
  if (b.serviceType === "TOWING" && a.serviceType !== "TOWING") return 1;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

/**
 * City string for feed "More" bucket: `User.city` first, else shop district's city
 * (shops often have district set before city is duplicated on the user row).
 */
export function resolveShopCityForFeed(shop: ShopForFeed): string {
  const fromUser = shop.user.city?.trim() ?? "";
  if (fromUser.length > 0) {
    return fromUser;
  }
  return shop.user.district?.city?.trim() ?? "";
}

/** Case- and spacing-insensitive city compare (owner vs shop city strings). */
export function normalizeCityKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Case- and whitespace-insensitive tag normalization (carMake, repair/parts category). */
export function normTag(raw: string): string {
  return raw.trim().toLowerCase();
}

/** True for posts the owner saved with the catch-all "Other" repair/parts category.
 *  OwnerPostEditor returns "general" when the user picks "Other" with no free text;
 *  any other unknown value (custom typed by the user) also acts as "Other". */
export function isCatchAllCategory(value: string, knownSlugs: string[]): boolean {
  const v = normTag(value);
  if (v === "general" || v === "other") return true;
  return !knownSlugs.map(normTag).includes(v);
}

/** Slugs the mobile app's chip pickers know about. Keep in sync with
 *  `mobile/lib/taxonomy-labels.ts` REPAIR_CATEGORY_SLUGS / PARTS_CATEGORY_SLUGS. */
export const REPAIR_CATEGORY_SLUGS = [
  "Engine",
  "Brakes",
  "Electrical",
  "AC",
  "Tyres",
  "Suspension",
  "Body & Paint",
  "Transmission",
  "Exhaust",
  "Oil & Fluids",
  "Other",
];
export const PARTS_CATEGORY_SLUGS = [
  "Engine parts",
  "Brakes",
  "Filters",
  "Electrical",
  "Suspension",
  "Body parts",
  "Other",
];

/**
 * Distance from shop district to post coordinates; null when not computable
 * or when parts+nationwide treats distance as N/A for the matched feed.
 */
export function computeDistanceKmForPost(
  shop: ShopForFeed,
  post: PostForFeed,
): number | null {
  if (post.serviceType === "PARTS" && shop.partsNationwide) {
    return null;
  }
  if (!post.lat || !post.lng || !shop.user.district) {
    return null;
  }
  const dist = haversineKm(
    { lat: shop.user.district.lat, lng: shop.user.district.lng },
    { lat: post.lat, lng: post.lng },
  );
  return parseFloat(dist.toFixed(1));
}

/**
 * Active posts in the shop's city that did not qualify for the main (matched) feed.
 * Same category + same tab service-type scope as `posts` passed in.
 * City = `resolveShopCityForFeed(shop)` vs `post.district.city` (trimmed equality).
 */
export function moreFeedEntriesInShopCity(
  shop: ShopForFeed,
  allPosts: PostForFeed[],
  matched: FeedEntry[],
): FeedEntry[] {
  const shopCity = resolveShopCityForFeed(shop);
  if (shopCity.length === 0) {
    return [];
  }
  const shopKey = normalizeCityKey(shopCity);
  const matchedIds = new Set(matched.map((e) => e.id));
  const out: FeedEntry[] = [];
  for (const post of allPosts) {
    if (matchedIds.has(post.id)) continue;
    const postCity = post.district?.city?.trim() ?? "";
    if (postCity.length === 0 || normalizeCityKey(postCity) !== shopKey) continue;
    out.push({
      ...post,
      distanceKm: computeDistanceKmForPost(shop, post),
    });
  }
  out.sort(sortFeedEntries);
  return out;
}

const MORE_POOL_CAP = 120;

export type MoreFeedBuild = {
  entries: FeedEntry[];
  /** Rows that matched only the same-city rule (subset of entries when national fill is used). */
  cityMatchedCount: number;
};

/**
 * "More" tab: same-city non-matched first, then other active posts in the feed query
 * that still did not match (so the shop can discover work outside strict filters / city).
 */
export function buildMoreFeedEntries(
  shop: ShopForFeed,
  allPosts: PostForFeed[],
  matched: FeedEntry[],
): MoreFeedBuild {
  const cityMore = moreFeedEntriesInShopCity(shop, allPosts, matched);
  const used = new Set<string>([
    ...matched.map((m) => m.id),
    ...cityMore.map((m) => m.id),
  ]);
  const out: FeedEntry[] = [...cityMore];
  const sorted = [...allPosts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  for (const post of sorted) {
    if (used.has(post.id)) continue;
    if (out.length >= MORE_POOL_CAP) break;
    out.push({
      ...post,
      distanceKm: computeDistanceKmForPost(shop, post),
    });
    used.add(post.id);
  }
  out.sort(sortFeedEntries);
  return { entries: out, cityMatchedCount: cityMore.length };
}

/**
 * Server-side shop feed filter (guide Section 11).
 * Empty `repairCategories` / `partsCategories` / `carMakes` means no restriction
 * on that axis (shops that skipped or cleared chips still see relevant posts).
 */
export function filterPostsForShop(
  shop: ShopForFeed,
  posts: PostForFeed[],
): FeedEntry[] {
  const results: FeedEntry[] = [];

  for (const post of posts) {
    if (post.category !== shop.category) continue;
    if (post.serviceType === "REPAIR" && !shop.offersRepair) continue;
    if (post.serviceType === "PARTS" && !shop.offersParts) continue;
    if (post.serviceType === "TOWING" && !shop.offersTowing) continue;

    if (post.carMake && shop.carMakes.length > 0) {
      const shopMakes = shop.carMakes.map(normTag);
      if (!shopMakes.includes(normTag(post.carMake))) continue;
    }

    if (post.carYear) {
      if (shop.carYearMin && post.carYear < shop.carYearMin) continue;
      if (shop.carYearMax && post.carYear > shop.carYearMax) continue;
    }

    if (
      post.serviceType === "REPAIR" &&
      post.repairCategory &&
      shop.repairCategories.length > 0
    ) {
      const shopCats = shop.repairCategories.map(normTag);
      const postCat = normTag(post.repairCategory);
      // Generic / "Other" / custom-typed posts match shops that accept Other jobs.
      const matched = isCatchAllCategory(post.repairCategory, REPAIR_CATEGORY_SLUGS)
        ? shopCats.includes("other")
        : shopCats.includes(postCat);
      if (!matched) continue;
    }
    if (
      post.serviceType === "PARTS" &&
      post.partsCategory &&
      shop.partsCategories.length > 0
    ) {
      const shopCats = shop.partsCategories.map(normTag);
      const postCat = normTag(post.partsCategory);
      const matched = isCatchAllCategory(post.partsCategory, PARTS_CATEGORY_SLUGS)
        ? shopCats.includes("other")
        : shopCats.includes(postCat);
      if (!matched) continue;
    }

    // Parts shops with nationwide delivery bypass the city check.
    if (post.serviceType === "PARTS" && shop.partsNationwide) {
      results.push({ ...post, distanceKm: null });
      continue;
    }

    // City-based filter (district is informational only).
    // Reasoning: a Baghdad shop should not see Erbil requests, but within
    // the same city, district shouldn't matter. The previous radius check
    // could exclude same-city posts (when districts were geographically
    // far apart) and could let through cross-city posts (when border
    // districts of two cities happened to be close).
    const shopCity = resolveShopCityForFeed(shop);
    const postCity = post.district?.city?.trim() ?? "";
    if (shopCity.length === 0 || postCity.length === 0) continue;
    if (normalizeCityKey(shopCity) !== normalizeCityKey(postCity)) continue;

    // Distance is still computed for display on the card (informational).
    results.push({
      ...post,
      distanceKm: computeDistanceKmForPost(shop, post),
    });
  }

  results.sort(sortFeedEntries);

  return results;
}
