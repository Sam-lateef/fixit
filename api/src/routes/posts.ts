import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { ServiceCategory, ServiceType, VehicleType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { notifyShopsNewPost } from "../services/notify-shops.js";
import { sendPush } from "../services/fcm.js";
import { pushBidForOwner, resolvePushLocale } from "../services/push-i18n.js";
import { sortBidsByScore } from "../services/bid-score.js";
import { syncPostMediaAssets } from "../services/media-assets.js";

const createPostSchema = z
  .object({
    serviceType: z.nativeEnum(ServiceType),
    category: z.nativeEnum(ServiceCategory),
    vehicleType: z.nativeEnum(VehicleType).optional(),
    title: z.string().min(1).max(150).optional(),
    repairCategory: z.string().max(80).optional(),
    partsCategory: z.string().max(80).optional(),
    conditionNew: z.boolean().optional(),
    conditionUsed: z.boolean().optional(),
    carMake: z.string().max(80).optional(),
    carModel: z.string().max(80).optional(),
    carYear: z.number().int().min(1950).max(2035).optional(),
    motorcycleDetails: z.string().min(1).max(200).optional(),
    deliveryNeeded: z.boolean().optional(),
    towingFromLat: z.number().optional(),
    towingFromLng: z.number().optional(),
    towingFromAddress: z.string().max(500).optional(),
    towingToAddress: z.string().max(500).optional(),
    urgency: z.enum(["ASAP", "WITHIN_HOUR"]).optional(),
    districtId: z.string().min(1).optional(),
    description: z.string().min(1).max(2000),
    photoUrls: z.array(z.string().min(1).max(2048)).max(3),
  })
  .superRefine((data, ctx) => {
    if (data.serviceType === "TOWING") {
      if (data.towingFromLat === undefined || data.towingFromLng === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "towingFromLat and towingFromLng required for TOWING",
        });
      }
    } else if (!data.districtId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "districtId required for REPAIR and PARTS",
      });
    }
    // TOWING posts collect pickup location + free-text notes instead of
    // vehicle make/model. Mirror the CAR + TOWING behaviour (carMake/Model
    // not required) so MOTORCYCLE + TOWING doesn't ask for a field the
    // editor doesn't even render — see OwnerPostEditor.tsx visibility gate
    // at the motorcycleDetails input.
    if (
      data.vehicleType === "MOTORCYCLE" &&
      data.serviceType !== "TOWING"
    ) {
      if (!data.motorcycleDetails || data.motorcycleDetails.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["motorcycleDetails"],
          message:
            "motorcycleDetails required when vehicleType=MOTORCYCLE and serviceType is REPAIR or PARTS",
        });
      }
    }
  });

const updatePostSchema = z
  .object({
    title: z.string().min(1).max(150).optional(),
    description: z.string().min(1).max(2000).optional(),
    photoUrls: z.array(z.string().min(1).max(2048)).max(3).optional(),
    repairCategory: z.string().max(80).optional(),
    partsCategory: z.string().max(80).optional(),
    conditionNew: z.boolean().optional(),
    conditionUsed: z.boolean().optional(),
    carMake: z.string().max(80).optional(),
    carModel: z.string().max(80).optional(),
    carYear: z.number().int().min(1950).max(2035).nullable().optional(),
    motorcycleDetails: z.string().min(1).max(200).nullable().optional(),
    deliveryNeeded: z.boolean().optional(),
    districtId: z.string().min(1).optional(),
    towingFromLat: z.number().optional(),
    towingFromLng: z.number().optional(),
    towingFromAddress: z.string().max(500).optional(),
    towingToAddress: z.string().max(500).optional(),
    urgency: z.enum(["ASAP", "WITHIN_HOUR"]).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export async function notifyOwnerNewBid(
  postUserId: string,
  postId: string,
): Promise<void> {
  const owner = await prisma.user.findUnique({
    where: { id: postUserId },
  });
  if (!owner?.fcmToken) return;
  const loc = resolvePushLocale(owner.preferredLocale);
  const copy = pushBidForOwner(loc);
  await sendPush(owner.fcmToken, copy.title, copy.body, { postId, type: "BID" }, true);
}

export async function registerPostRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    "/api/v1/posts",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.userType !== "OWNER") {
        return reply.status(403).send({ error: "Owner account required" });
      }
      const parsed = createPostSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }
      const body = parsed.data;
      // Kept in sync with the user-facing copy `postCreatedBody` in
      // `mobile/lib/strings.ts` ("Request will be removed if no shop responds
      // in 3 days"). If you change one, change the other.
      const POST_TTL_HOURS = 72;
      const expiresAt = new Date(
        Date.now() + POST_TTL_HOURS * 60 * 60 * 1000,
      );

      let lat: number | undefined;
      let lng: number | undefined;
      let districtId: string | null = body.districtId ?? null;

      if (body.serviceType === "TOWING") {
        lat = body.towingFromLat;
        lng = body.towingFromLng;
        if (!districtId) {
          const u = await prisma.user.findUnique({
            where: { id: request.userId },
            select: { districtId: true },
          });
          districtId = u?.districtId ?? null;
        }
      } else {
        const d = await prisma.district.findUnique({
          where: { id: body.districtId! },
        });
        if (!d) {
          return reply.status(400).send({ error: "Invalid districtId" });
        }
        lat = d.lat;
        lng = d.lng;
        districtId = d.id;
      }

      const isMoto = body.vehicleType === "MOTORCYCLE";
      const post = await prisma.post.create({
        data: {
          userId: request.userId,
          serviceType: body.serviceType,
          category: body.category,
          vehicleType: body.vehicleType ?? "CAR",
          title: body.title,
          repairCategory: body.repairCategory,
          partsCategory: body.partsCategory,
          conditionNew: body.conditionNew ?? false,
          conditionUsed: body.conditionUsed ?? false,
          // For motorcycle posts, car-specific fields are nulled — clients
          // shouldn't send them, but defensively drop them here too.
          carMake: isMoto ? null : body.carMake,
          carModel: isMoto ? null : body.carModel,
          carYear: isMoto ? null : body.carYear,
          motorcycleDetails: isMoto ? body.motorcycleDetails?.trim() : null,
          deliveryNeeded: body.deliveryNeeded ?? false,
          towingFromLat: body.towingFromLat,
          towingFromLng: body.towingFromLng,
          towingFromAddress: body.towingFromAddress,
          towingToAddress: body.towingToAddress,
          urgency: body.urgency,
          districtId,
          lat,
          lng,
          description: body.description,
          photoUrls: body.photoUrls,
          expiresAt,
        },
      });
      await syncPostMediaAssets(post.id, request.userId, body.photoUrls);

      void notifyShopsNewPost(post).catch((e) =>
        console.error("[notifyShopsNewPost]", e),
      );

      return { post };
    },
  );

  fastify.get(
    "/api/v1/posts/mine",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.userType !== "OWNER") {
        return reply.status(403).send({ error: "Owner account required" });
      }
      const posts = await prisma.post.findMany({
        where: { userId: request.userId, status: { not: "DELETED" } },
        include: {
          bids: {
            where: { status: { not: "WITHDRAWN" } },
            include: {
              // Include the shop's user.city and user.district so the owner
              // sees where each bidding shop is located on the bid card.
              shop: { include: { user: { include: { district: true } } } },
              chatThread: { select: { id: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      const withSorted = posts.map((p) => ({
        ...p,
        bids: sortBidsByScore(p.bids),
      }));
      return { posts: withSorted };
    },
  );

  fastify.patch(
    "/api/v1/posts/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.userType !== "OWNER") {
        return reply.status(403).send({ error: "Owner account required" });
      }
      const parsedParams = z
        .object({ id: z.string().min(1) })
        .safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(400).send({ error: "Invalid post id" });
      }
      const { id } = parsedParams.data;
      const parsed = updatePostSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }
      const body = parsed.data;

      const post = await prisma.post.findFirst({
        where: { id, userId: request.userId },
      });
      if (!post) {
        return reply.status(404).send({ error: "Post not found" });
      }
      if (post.status !== "ACTIVE") {
        return reply.status(400).send({ error: "Only active posts can be edited" });
      }

      const data: Prisma.PostUncheckedUpdateInput = {};

      if (body.title !== undefined) {
        data.title = body.title;
      }
      if (body.description !== undefined) {
        data.description = body.description;
      }
      if (body.photoUrls !== undefined) {
        data.photoUrls = body.photoUrls;
      }
      if (body.repairCategory !== undefined) {
        data.repairCategory = body.repairCategory;
      }
      if (body.partsCategory !== undefined) {
        data.partsCategory = body.partsCategory;
      }
      if (body.conditionNew !== undefined) {
        data.conditionNew = body.conditionNew;
      }
      if (body.conditionUsed !== undefined) {
        data.conditionUsed = body.conditionUsed;
      }
      if (body.carMake !== undefined) {
        data.carMake = body.carMake;
      }
      if (body.carModel !== undefined) {
        data.carModel = body.carModel;
      }
      if (body.carYear !== undefined) {
        data.carYear = body.carYear;
      }
      if (body.motorcycleDetails !== undefined) {
        data.motorcycleDetails = body.motorcycleDetails
          ? body.motorcycleDetails.trim()
          : null;
      }
      if (body.deliveryNeeded !== undefined) {
        data.deliveryNeeded = body.deliveryNeeded;
      }
      if (body.towingFromLat !== undefined) {
        data.towingFromLat = body.towingFromLat;
      }
      if (body.towingFromLng !== undefined) {
        data.towingFromLng = body.towingFromLng;
      }
      if (body.towingFromAddress !== undefined) {
        data.towingFromAddress = body.towingFromAddress;
      }
      if (body.towingToAddress !== undefined) {
        data.towingToAddress = body.towingToAddress;
      }
      if (body.urgency !== undefined) {
        data.urgency = body.urgency;
      }

      if (body.districtId !== undefined) {
        const d = await prisma.district.findUnique({
          where: { id: body.districtId },
        });
        if (!d) {
          return reply.status(400).send({ error: "Invalid districtId" });
        }
        data.districtId = d.id;
        if (post.serviceType !== "TOWING") {
          data.lat = d.lat;
          data.lng = d.lng;
        }
      }

      const updated = await prisma.post.update({
        where: { id },
        data,
      });
      if (body.photoUrls !== undefined) {
        await syncPostMediaAssets(updated.id, request.userId, body.photoUrls);
      }
      return { post: updated };
    },
  );

  fastify.get(
    "/api/v1/posts/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().min(1) })
        .safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(400).send({ error: "Invalid post id" });
      }
      const { id } = parsedParams.data;
      const post = await prisma.post.findFirst({
        where: { id, status: { not: "DELETED" } },
        include: {
          user: { select: { name: true } },
          district: { select: { name: true, nameAr: true, city: true } },
          bids: { where: { status: { not: "WITHDRAWN" } }, select: { shopId: true } },
        },
      });
      if (!post) return reply.status(404).send({ error: "Post not found" });

      // Gating: authenticated user must either own the post or be a SHOP
      // (shops legitimately need to fetch any post to bid on it from their
      // feed). This blocks an OWNER from enumerating other owners' posts
      // by id, which the previous "any authenticated user" check allowed.
      const isOwner = post.userId === request.userId;
      const isShop = request.userType === "SHOP";
      if (!isOwner && !isShop) {
        return reply.status(404).send({ error: "Post not found" });
      }
      return { post };
    },
  );

  fastify.delete(
    "/api/v1/posts/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().min(1) })
        .safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(400).send({ error: "Invalid post id" });
      }
      const { id } = parsedParams.data;
      const post = await prisma.post.findFirst({
        where: { id, userId: request.userId },
      });
      if (!post) {
        return reply.status(404).send({ error: "Post not found" });
      }
      await prisma.post.update({
        where: { id },
        data: { status: "DELETED" },
      });
      return { success: true };
    },
  );
}
