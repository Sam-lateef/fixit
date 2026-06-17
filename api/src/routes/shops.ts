import type { FastifyInstance, FastifyRequest } from "fastify";
import { ServiceCategory, ShopType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { E164_WHATSAPP_OTP } from "../lib/phone.js";
import {
  refineWorkshopCoordsTogether,
  workshopLatField,
  workshopLngField,
} from "../lib/workshop-coords.js";
import { pickDefined } from "../util/object.js";

function shopProfileDebugEnabled(): boolean {
  return process.env.DEBUG_SHOP_PROFILE?.trim() === "1";
}

function coverUrlHint(url: string | null | undefined): string {
  if (url == null || url.length === 0) {
    return "(none)";
  }
  try {
    const u = new URL(url);
    const path = u.pathname.length > 48 ? `${u.pathname.slice(0, 48)}…` : u.pathname;
    return `${u.origin}${path}`;
  } catch {
    return "(invalid-url)";
  }
}

function shopDebugLog(req: FastifyRequest, payload: Record<string, unknown>): void {
  if (!shopProfileDebugEnabled()) {
    return;
  }
  req.log.info({ tag: "ShopProfile", ...payload });
}

const createShopBody = z.object({
  name: z.string().min(1).max(120),
  // Discriminator chosen at signup. Drives which downstream offer/vehicle
  // combinations are allowed — see refineShopTypeConsistency below.
  shopType: z.nativeEnum(ShopType),
  category: z.nativeEnum(ServiceCategory),
  offersRepair: z.boolean(),
  offersParts: z.boolean(),
  offersTowing: z.boolean(),
  carMakes: z.array(z.string()),
  carYearMin: z.number().int().optional(),
  carYearMax: z.number().int().optional(),
  repairCategories: z.array(z.string()),
  partsCategories: z.array(z.string()),
  repairRadiusKm: z.number().int().min(1).max(50).optional(),
  partsRadiusKm: z.number().int().min(1).max(50).optional(),
  towingRadiusKm: z.number().int().min(1).max(30).optional(),
  servedDistrictIds: z.array(z.string().min(1)).optional(),
  partsNationwide: z.boolean(),
  city: z.string().min(1),
  districtId: z.union([z.string().min(1), z.null()]).optional(),
  // Address is allowed to be empty here; the superRefine below requires it
  // for everything EXCEPT towing shops (mobile providers — no fixed
  // physical address). User.address is nullable in Prisma.
  address: z.string().max(500),
  // Optional "about your shop" blurb. Empty / whitespace-only strings are
  // stored as null so the column doesn't fill with junk from over-eager
  // clients that always include the key.
  bio: z.union([z.string().max(500), z.null()]).optional(),
  // Phone is optional in the request body (because OTP-auth users already
  // have user.phone populated from the OTP flow), but the POST handler
  // requires the FINAL user.phone to be non-null and E.164-valid.
  // Google-sign-in users land with phone === null and must supply one here.
  phone: z
    .string()
    .regex(E164_WHATSAPP_OTP, "Phone must be a valid Iraqi WhatsApp number (+9647XXXXXXXXX)")
    .optional(),
  workshopLat: workshopLatField.optional(),
  workshopLng: workshopLngField.optional(),
});

/**
 * Cross-field validity for the new ShopType discriminator:
 *   CAR / MOTORCYCLE  → offersRepair || offersParts ; offersTowing must be false
 *   TOWING            → offersTowing must be true ; offersRepair / offersParts must be false
 *
 * This is the single source of truth that replaces the old "hasOffer" check
 * inside the POST handler and the per-vehicle services* booleans.
 */
function refineShopTypeConsistency(
  data: {
    shopType: ShopType;
    offersRepair: boolean;
    offersParts: boolean;
    offersTowing: boolean;
  },
  ctx: z.RefinementCtx,
): void {
  if (data.shopType === "TOWING") {
    if (!data.offersTowing) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["offersTowing"],
        message: "Towing shops must have offersTowing=true",
      });
    }
    if (data.offersRepair || data.offersParts) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["shopType"],
        message: "Towing shops cannot also offer repair or parts",
      });
    }
    return;
  }
  // CAR / MOTORCYCLE
  if (data.offersTowing) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["offersTowing"],
      message: "Only TOWING-type shops can offer towing",
    });
  }
  if (!data.offersRepair && !data.offersParts) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["offersRepair"],
      message: "Select at least one of repair or parts",
    });
  }
}

function refineAddressUnlessTowing(
  data: {
    shopType: ShopType;
    address: string;
  },
  ctx: z.RefinementCtx,
): void {
  if (data.shopType !== "TOWING" && data.address.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["address"],
      message: "Address is required",
    });
  }
}

const createShopSchema = createShopBody
  .superRefine(refineShopTypeConsistency)
  .superRefine(refineAddressUnlessTowing)
  .superRefine(refineWorkshopCoordsTogether);

const coverImageUrlSchema = z
  .union([z.string().max(2048), z.null()])
  .optional();

const yearFieldUpdate = z
  .union([z.number().int().min(1950).max(2035), z.null()])
  .optional();

// shopType and offersTowing are IMMUTABLE after signup — changing them would
// orphan car/repair/parts data and break active bids. Profile editor must not
// even send these keys; reject them at the schema layer if they appear.
const updateShopSchema = createShopBody
  .omit({ shopType: true, offersTowing: true })
  .partial()
  .extend({
    name: z.string().min(1).max(120).optional(),
    coverImageUrl: coverImageUrlSchema,
    /** Allow null on PATCH to clear year filters (partial() alone rejects null). */
    carYearMin: yearFieldUpdate,
    carYearMax: yearFieldUpdate,
    /** partial() keeps districtId as optional string only; allow explicit null. */
    districtId: z.union([z.string().min(1), z.null()]).optional(),
  })
  .superRefine(refineWorkshopCoordsTogether);

export async function registerShopRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    "/api/v1/shops",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.userType !== "SHOP") {
        return reply.status(403).send({ error: "Shop account required" });
      }
      const parsed = createShopSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }
      const existing = await prisma.shop.findUnique({
        where: { userId: request.userId },
      });
      if (existing) {
        return reply.status(409).send({ error: "Shop already exists" });
      }
      const body = parsed.data;
      // Note: refineShopTypeConsistency already enforced
      //   - shopType=TOWING ⇒ offersTowing && !offersRepair && !offersParts
      //   - shopType=CAR|MOTORCYCLE ⇒ (offersRepair||offersParts) && !offersTowing
      // so a separate "at least one service" guard is no longer required.

      // Shops must be reachable by phone. OTP-auth users already have
      // user.phone set; Google-sign-in users land with null and must
      // include `phone` in this request. We resolve the final value here
      // and reject if it would still be null.
      const currentUser = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { phone: true },
      });
      const phoneToSet =
        typeof body.phone === "string" && body.phone.trim().length > 0
          ? body.phone.trim()
          : currentUser?.phone ?? null;
      if (!phoneToSet) {
        return reply.status(400).send({
          error: "Phone number is required for shops",
          field: "phone",
        });
      }
      // Towing-only shops may submit empty address — persist null so it
      // round-trips cleanly through the public shop payload.
      const trimmedAddress = body.address.trim();
      const userCreateData: {
        city: string;
        districtId: string | null;
        address: string | null;
        phone?: string;
        workshopLat?: number | null;
        workshopLng?: number | null;
      } = {
        city: body.city,
        districtId: body.districtId ?? null,
        address: trimmedAddress.length > 0 ? trimmedAddress : null,
      };
      // Only patch phone when the body actually contained one (to avoid
      // re-writing the same value and tripping the unique constraint via
      // case/whitespace differences from upstream proxies).
      if (
        typeof body.phone === "string" &&
        body.phone.trim().length > 0 &&
        body.phone.trim() !== currentUser?.phone
      ) {
        userCreateData.phone = body.phone.trim();
      }
      if (body.workshopLat !== undefined && body.workshopLng !== undefined) {
        userCreateData.workshopLat = body.workshopLat;
        userCreateData.workshopLng = body.workshopLng;
      }
      try {
        await prisma.user.update({
          where: { id: request.userId },
          data: userCreateData,
        });
      } catch (e) {
        // Prisma P2002 = unique constraint failure (User.phone is @unique).
        // Surface a friendly error instead of leaking the DB-level message.
        const code = (e as { code?: string } | null)?.code;
        if (code === "P2002") {
          return reply.status(409).send({
            error: "This phone number is already linked to another account.",
            field: "phone",
          });
        }
        throw e;
      }
      const bioTrimmed =
        typeof body.bio === "string" ? body.bio.trim() : null;
      const shop = await prisma.shop.create({
        data: {
          userId: request.userId,
          name: body.name,
          shopType: body.shopType,
          category: body.category,
          offersRepair: body.offersRepair,
          offersParts: body.offersParts,
          offersTowing: body.offersTowing,
          bio: bioTrimmed && bioTrimmed.length > 0 ? bioTrimmed : null,
          carMakes: body.carMakes,
          carYearMin: body.carYearMin,
          carYearMax: body.carYearMax,
          repairCategories: body.repairCategories,
          partsCategories: body.partsCategories,
          repairRadiusKm: body.repairRadiusKm,
          partsRadiusKm: body.partsRadiusKm,
          towingRadiusKm: body.towingRadiusKm,
          servedDistrictIds: body.servedDistrictIds ?? [],
          partsNationwide: body.partsNationwide,
        },
      });
      return { shop };
    },
  );

  fastify.get(
    "/api/v1/shops/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const shop = await prisma.shop.findUnique({
        where: { userId: request.userId },
        include: { user: { include: { district: true } } },
      });
      if (!shop) {
        return reply.status(404).send({ error: "Shop not found" });
      }
      // bidsWon column was never incremented; compute live from accepted bids.
      const bidsWon = await prisma.bid.count({
        where: { shopId: shop.id, status: "ACCEPTED" },
      });
      // Resolve servedDistrictIds -> { id, name, nameAr, city } so the
      // mobile profile can render actual district names (not just a count).
      const servedDistricts =
        shop.servedDistrictIds.length > 0
          ? await prisma.district.findMany({
              where: { id: { in: shop.servedDistrictIds } },
              select: { id: true, name: true, nameAr: true, city: true },
            })
          : [];
      shopDebugLog(request, {
        op: "GET shops/me ok",
        shopId: shop.id,
        name: shop.name,
        bidsWon,
        cover: coverUrlHint(shop.coverImageUrl),
      });
      return { shop: { ...shop, bidsWon, servedDistricts } };
    },
  );

  fastify.get(
    "/api/v1/shops/by-id/:shopId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const params = z.object({ shopId: z.string().min(1) }).safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ error: "Invalid shop id" });
      }
      // PUBLIC-SHOP payload: this route is consumed by other authenticated
      // users (owners viewing a shop they bid with), so the user record must
      // never include private/system fields like fcmToken, preferredLocale,
      // bannedAt, role, userType, or timestamps. Whitelist only the
      // ShopProfilePayload-required columns.
      const shop = await prisma.shop.findUnique({
        where: { id: params.data.shopId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              city: true,
              address: true,
              workshopLat: true,
              workshopLng: true,
              district: true,
            },
          },
        },
      });
      if (!shop) {
        return reply.status(404).send({ error: "Shop not found" });
      }
      const bidsWon = await prisma.bid.count({
        where: { shopId: shop.id, status: "ACCEPTED" },
      });
      const servedDistricts =
        shop.servedDistrictIds.length > 0
          ? await prisma.district.findMany({
              where: { id: { in: shop.servedDistrictIds } },
              select: { id: true, name: true, nameAr: true, city: true },
            })
          : [];
      return { shop: { ...shop, bidsWon, servedDistricts } };
    },
  );

  fastify.put(
    "/api/v1/shops/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.userType !== "SHOP") {
        return reply.status(403).send({ error: "Shop account required" });
      }
      const rawBody =
        request.body !== null &&
        typeof request.body === "object" &&
        !Array.isArray(request.body)
          ? (request.body as Record<string, unknown>)
          : {};

      const parsed = updateShopSchema.safeParse(request.body);
      if (!parsed.success) {
        shopDebugLog(request, {
          op: "PUT shops/me zod fail",
          issues: parsed.error.flatten(),
        });
        return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }
      const shop = await prisma.shop.findUnique({
        where: { userId: request.userId },
      });
      if (!shop) {
        return reply.status(404).send({ error: "Shop not found" });
      }
      const body = parsed.data;

      // CAR / MOTORCYCLE shops must keep at least one of repair/parts ON.
      // Compute the post-patch state to validate before persisting.
      // (TOWING shops have offersRepair/Parts = false by construction and we
      // already strip offersTowing from the update body, so they're inert
      // here unless someone hand-crafts a malicious request.)
      const effectiveOffersRepair =
        typeof body.offersRepair === "boolean"
          ? body.offersRepair
          : shop.offersRepair;
      const effectiveOffersParts =
        typeof body.offersParts === "boolean"
          ? body.offersParts
          : shop.offersParts;
      if (
        shop.shopType !== "TOWING" &&
        !effectiveOffersRepair &&
        !effectiveOffersParts
      ) {
        return reply.status(400).send({
          error: "At least one of repair or parts must remain enabled",
          field: "offersRepair",
        });
      }

      // Prefer raw JSON for coverImageUrl when present. Some clients/proxies have been observed
      // where Zod’s parsed `body` omits `coverImageUrl` but Prisma still receives a no-op `{}`
      // update (empty `data` → row unchanged → hero cover never persists).
      const coverFromRawUntrimmed =
        typeof rawBody.coverImageUrl === "string"
          ? rawBody.coverImageUrl
          : typeof rawBody.cover_image_url === "string"
            ? (rawBody.cover_image_url as string)
            : undefined;
      const coverFromRaw =
        coverFromRawUntrimmed !== undefined ? coverFromRawUntrimmed.trim() : undefined;
      if (coverFromRaw !== undefined && coverFromRaw.length > 2048) {
        return reply.status(400).send({ error: "coverImageUrl too long (max 2048 characters)" });
      }
      const coverMerged =
        coverFromRaw !== undefined && coverFromRaw.length > 0
          ? coverFromRaw
          : body.coverImageUrl;

      const nameFromRaw =
        typeof rawBody.name === "string" ? rawBody.name.trim() : undefined;
      if (nameFromRaw !== undefined && nameFromRaw.length > 120) {
        return reply.status(400).send({ error: "name too long (max 120 characters)" });
      }
      const nameMerged =
        nameFromRaw !== undefined && nameFromRaw.length > 0 ? nameFromRaw : body.name;

      // Address: empty string → null so towing-only shops can clear it.
      // undefined (not in patch) → no change.
      const addressForUpdate =
        typeof body.address === "string"
          ? body.address.trim().length > 0
            ? body.address.trim()
            : null
          : undefined;
      const userPatch = pickDefined({
        city: body.city,
        districtId: body.districtId,
        address: addressForUpdate,
        workshopLat: body.workshopLat,
        workshopLng: body.workshopLng,
      });
      // shopType and offersTowing are intentionally absent — both are
      // immutable after signup (changing them would orphan car/repair/parts
      // data and break active bids) and `updateShopSchema.omit()` already
      // strips them at the validation layer.
      // Bio: empty / whitespace-only string clears the column (null). undefined
      // (not in patch) → no change. Same normalisation rule as the POST path.
      const bioForUpdate =
        typeof body.bio === "string"
          ? body.bio.trim().length > 0
            ? body.bio.trim()
            : null
          : body.bio === null
            ? null
            : undefined;
      const shopPatch = pickDefined({
        name: nameMerged,
        coverImageUrl: coverMerged,
        bio: bioForUpdate,
        offersRepair: body.offersRepair,
        offersParts: body.offersParts,
        carMakes: body.carMakes,
        carYearMin: body.carYearMin,
        carYearMax: body.carYearMax,
        repairCategories: body.repairCategories,
        partsCategories: body.partsCategories,
        repairRadiusKm: body.repairRadiusKm,
        partsRadiusKm: body.partsRadiusKm,
        towingRadiusKm: body.towingRadiusKm,
        servedDistrictIds: body.servedDistrictIds,
        partsNationwide: body.partsNationwide,
      });

      if (Object.keys(userPatch).length === 0 && Object.keys(shopPatch).length === 0) {
        request.log.warn({
          tag: "ShopProfile",
          op: "PUT shops/me rejected empty patch",
          receivedKeys: Object.keys(rawBody),
        });
        return reply.status(400).send({
          error: "No valid fields to update",
          receivedKeys: Object.keys(rawBody),
        });
      }

      shopDebugLog(request, {
        op: "PUT shops/me inbound",
        shopId: shop.id,
        patchKeys: Object.keys(shopPatch),
        userPatchKeys: Object.keys(userPatch),
        nameInPatch: typeof shopPatch.name === "string" ? shopPatch.name : undefined,
        coverInPatch:
          typeof shopPatch.coverImageUrl === "string"
            ? coverUrlHint(shopPatch.coverImageUrl)
            : shopPatch.coverImageUrl === null
              ? "(null)"
              : undefined,
      });

      const updated = await prisma.$transaction(async (tx) => {
        if (Object.keys(userPatch).length > 0) {
          await tx.user.update({
            where: { id: request.userId },
            data: userPatch,
          });
        }
        return tx.shop.update({
          where: { id: shop.id },
          data: shopPatch,
          include: { user: { include: { district: true } } },
        });
      });
      shopDebugLog(request, {
        op: "PUT shops/me ok",
        shopId: updated.id,
        name: updated.name,
        cover: coverUrlHint(updated.coverImageUrl),
      });
      return { shop: updated };
    },
  );
}
