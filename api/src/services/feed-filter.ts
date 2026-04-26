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

    if (
      post.serviceType === "REPAIR" &&
      post.repairCategory &&
      shop.repairCategories.length > 0 &&
      !shop.repairCategories.includes(post.repairCategory)
    ) {
      continue;
    }
    if (
      post.serviceType === "PARTS" &&
      post.partsCategory &&
      shop.partsCategories.length > 0 &&
      !shop.partsCategories.includes(post.partsCategory)
    ) {
      continue;
    }

    if (post.serviceType === "PARTS" && shop.partsNationwide) {
      results.push({ ...post, distanceKm: null });
      continue;
    }

    if (!post.lat || !post.lng || !shopDistrict) {
      results.push({ ...post, distanceKm: null });
      continue;
    }

    const distKm = computeDistanceKmForPost(shop, post);
    if (distKm === null) {
      continue;
    }

    const radius =
      post.serviceType === "REPAIR"
        ? shop.repairRadiusKm
        : post.serviceType === "PARTS"
          ? shop.partsRadiusKm
          : shop.towingRadiusKm;

    if (distKm > radius) continue;

    results.push({ ...post, distanceKm: distKm });
  }

  results.sort(sortFeedEntries);

  return results;
}
