import type { Bid, Shop } from "@prisma/client";

export type BidWithShop = Bid & { shop: Shop };

/**
 * Weighted score for ranking bids on the owner My Posts screen (guide Section 11).
 */
export function scoreBid(bid: BidWithShop, allBids: BidWithShop[]): number {
  const prices = allBids.map((b) => b.priceEstimate);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const priceScore =
    maxPrice === minPrice
      ? 1
      : 1 - (bid.priceEstimate - minPrice) / (maxPrice - minPrice);

  const ratingScore = bid.shop.rating / 5;

  const today = Date.now();
  const apptTime = bid.appointmentDate
    ? new Date(bid.appointmentDate).getTime()
    : today + 7 * 86400000;
  const daysUntil = Math.max(0, (apptTime - today) / 86400000);
  const availScore = Math.max(0, 1 - daysUntil / 7);

  return priceScore * 0.5 + ratingScore * 0.3 + availScore * 0.2;
}

export function sortBidsByScore(bids: BidWithShop[]): BidWithShop[] {
  return [...bids].sort((a, b) => scoreBid(b, bids) - scoreBid(a, bids));
}
