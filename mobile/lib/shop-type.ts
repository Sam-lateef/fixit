/**
 * Shop type — mirrors the Prisma `ShopType` enum.
 *
 * Set once at signup and immutable thereafter. Drives which vehicle/service
 * gates the feed filter applies on the API side, plus which sections render
 * in the profile editor on the mobile side.
 *
 * - CAR        — services car requests; must pick at least one of repair/parts
 * - MOTORCYCLE — services tuktuk/motor requests; must pick at least one of
 *                repair/parts
 * - TOWING     — towing only, vehicle-agnostic
 */
export type ShopType = "CAR" | "MOTORCYCLE" | "TOWING";

export const ALL_SHOP_TYPES: ReadonlyArray<ShopType> = [
  "CAR",
  "MOTORCYCLE",
  "TOWING",
];

/**
 * Narrowing helper for values arriving from the API (where the column is
 * nullable during the rollout) or from untyped JSON params on the signup
 * wizard. Returns null for any unrecognised value.
 */
export function asShopType(value: unknown): ShopType | null {
  if (typeof value !== "string") return null;
  if (value === "CAR" || value === "MOTORCYCLE" || value === "TOWING") {
    return value;
  }
  return null;
}
