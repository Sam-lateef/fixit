import type { FastifyInstance, FastifyRequest } from "fastify";
import { ServiceCategory } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
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

const createShopSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.nativeEnum(ServiceCategory),
  offersRepair: z.boolean(),
  offersParts: z.boolean(),
  offersTowing: z.boolean(),
  carMakes: z.array(z.string()),
  carYearMin: z.number().int().optional(),
  carYearMax: z.number().int().optional(),
  repairCategories: z.array(z.string()),
  partsCategories: z.array(z.string()),
  deliveryAvailable: z.boolean(),
  repairRadiusKm: z.number().int().min(1).max(50).optional(),
  partsRadiusKm: z.number().int().min(1).max(50).optional(),
  towingRadiusKm: z.number().int().min(1).max(30).optional(),
  partsNationwide: z.boolean(),
  city: z.string().min(1),
  districtId: z.string().min(1),
  address: z.string().max(500).optional(),
});

const coverImageUrlSchema = z
  .union([z.string().max(2048), z.null()])
  .optional();

const updateShopSchema = createShopSchema.partial().extend({
  name: z.string().min(1).max(120).optional(),
  coverImageUrl: coverImageUrlSchema,
});

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
      const hasOffer =
        body.offersRepair || body.offersParts || body.offersTowing;
      if (!hasOffer) {
        return reply.status(400).send({ error: "Select at least one service" });
      }
      await prisma.user.update({
        where: { id: request.userId },
        data: {
          city: body.city,
          districtId: body.districtId,
          address: body.address,
        },
      });
      const shop = await prisma.shop.create({
        data: {
          userId: request.userId,
          name: body.name,
          category: body.category,
          offersRepair: body.offersRepair,
          offersParts: body.offersParts,
          offersTowing: body.offersTowing,
          carMakes: body.carMakes,
          carYearMin: body.carYearMin,
          carYearMax: body.carYearMax,
          repairCategories: body.repairCategories,
          partsCategories: body.partsCategories,
          deliveryAvailable: body.deliveryAvailable,
          repairRadiusKm: body.repairRadiusKm,
          partsRadiusKm: body.partsRadiusKm,
          towingRadiusKm: body.towingRadiusKm,
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
      shopDebugLog(request, {
        op: "GET shops/me ok",
        shopId: shop.id,
        name: shop.name,
        cover: coverUrlHint(shop.coverImageUrl),
      });
      return { shop };
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
      const shop = await prisma.shop.findUnique({
        where: { id: params.data.shopId },
        include: { user: { include: { district: true } } },
      });
      if (!shop) {
        return reply.status(404).send({ error: "Shop not found" });
      }
      return { shop };
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

      const userPatch = pickDefined({
        city: body.city,
        districtId: body.districtId,
        address: body.address,
      });
      const shopPatch = pickDefined({
        name: nameMerged,
        coverImageUrl: coverMerged,
        offersRepair: body.offersRepair,
        offersParts: body.offersParts,
        offersTowing: body.offersTowing,
        carMakes: body.carMakes,
        carYearMin: body.carYearMin,
        carYearMax: body.carYearMax,
        repairCategories: body.repairCategories,
        partsCategories: body.partsCategories,
        deliveryAvailable: body.deliveryAvailable,
        repairRadiusKm: body.repairRadiusKm,
        partsRadiusKm: body.partsRadiusKm,
        towingRadiusKm: body.towingRadiusKm,
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
