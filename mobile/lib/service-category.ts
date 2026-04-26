/** Service categories mirroring the Prisma ServiceCategory enum. */
export type ServiceCategory = "CARS" | "ELECTRICS" | "PLUMBING" | "METAL" | "WOOD";

/**
 * Full enum list — must stay aligned with Prisma `ServiceCategory`.
 * Use for API payloads, feed matching, and any logic that must accept all stored values.
 * Do not remove values when the UI hides non-Cars verticals.
 */
export const ALL_SERVICE_CATEGORIES: ReadonlyArray<ServiceCategory> = [
  "CARS",
  "ELECTRICS",
  "PLUMBING",
  "METAL",
  "WOOD",
];

/**
 * Categories shown in shop signup category picker.
 * Cars-only first release: other verticals stay in `ALL_SERVICE_CATEGORIES` for API/DB;
 * add entries here when you ship multi-category signup again.
 */
export const SERVICE_CATEGORIES_SIGNUP_VISIBLE: ReadonlyArray<ServiceCategory> = ["CARS"];
