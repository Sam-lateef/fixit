import type { ServiceCategory } from "@/lib/service-category";
import type { ShopType } from "@/lib/shop-type";

/**
 * Shop payload used by `/api/v1/shops/me`, `/api/v1/shops/by-id/:id`, and profile UIs.
 */
export type ShopProfilePayload = {
  id: string;
  name: string;
  category: ServiceCategory;
  /** Top-level shop discriminator, set once at signup, non-null since the
   *  shop-type rollout (May 2026). Drives which sections render in the
   *  profile editor and which posts the feed filter shows on the API. */
  shopType: ShopType;
  coverImageUrl: string | null;
  /** Optional "about your shop" blurb. Max 500 chars (API enforces). */
  bio: string | null;
  offersRepair: boolean;
  offersParts: boolean;
  offersTowing: boolean;
  rating: number;
  reviewCount: number;
  bidsWon: number;
  carMakes: string[];
  yearFrom: number | null;
  yearTo: number | null;
  carYearMin?: number | null;
  carYearMax?: number | null;
  repairCategories: string[];
  partsCategories: string[];
  partsNationwide: boolean;
  /** Districts the shop covers. Empty = whole city. */
  servedDistrictIds: string[];
  /** Resolved district details for `servedDistrictIds` (server-side lookup
   *  so the profile can render names without an extra round-trip). */
  servedDistricts: { id: string; name: string; nameAr: string; city: string }[];
  user: {
    /** Owner user id — needed for "report this user" actions. */
    id: string;
    name: string | null;
    phone: string | null;
    city: string | null;
    address: string | null;
    /** Saved workshop GPS for Maps + towing distance; optional. */
    workshopLat: number | null;
    workshopLng: number | null;
    district: { id: string; name: string; nameAr: string; city: string } | null;
  };
};
