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
  user: {
    name: string | null;
    phone: string | null;
    city: string | null;
    address: string | null;
    district: { name: string; nameAr: string } | null;
  };
};
