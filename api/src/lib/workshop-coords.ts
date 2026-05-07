import { z } from "zod";

/** Optional workshop GPS on `User` (shops). Both null clears the pin. */
export const workshopLatField = z.union([z.number().min(-90).max(90), z.null()]);
export const workshopLngField = z.union([z.number().min(-180).max(180), z.null()]);

export function refineWorkshopCoordsTogether<T extends { workshopLat?: unknown; workshopLng?: unknown }>(
  data: T,
  ctx: z.RefinementCtx,
): void {
  const hasLat = data.workshopLat !== undefined;
  const hasLng = data.workshopLng !== undefined;
  if (!hasLat && !hasLng) {
    return;
  }
  if (!hasLat || !hasLng) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "workshopLat and workshopLng must be sent together",
      path: hasLat ? ["workshopLng"] : ["workshopLat"],
    });
  }
}
