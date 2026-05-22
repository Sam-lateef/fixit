import type { ServiceCategory } from "@/lib/service-category";

/**
 * Shop payload used by `/api/v1/shops/me`, `/api/v1/shops/by-id/:id`, and profile UIs.
 */
export type ShopProfilePayload = {
  id: string;
  name: string;
  category: ServiceCategory;
  coverImageUrl: string | null;
  offersRepair: boolean;
  offersParts: boolean;
  offersTowing: boolean;
  /** Whether the shop services cars. Default true. Set false for pure
   *  motorcycle / tuktuk shops that don't take car work — feed and notify
   *  skip CAR posts when false. */
  servicesCars: boolean;
  /** Whether the shop services motorcycles. Single toggle that opts the shop
   *  into all motorcycle leads for whichever services (offers*) they provide. */
  servicesMotorcycles: boolean;
  deliveryAvailable: boolean;
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
