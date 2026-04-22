import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { notifyOwnerNewBid } from "./posts.js";
import { sendPush } from "../services/fcm.js";

const createBidSchema = z.object({
  priceEstimate: z.number().int().positive(),
  appointmentDate: z.string().datetime().optional(),
  appointmentTime: z.string().max(32).optional(),
  estimatedQty: z.number().int().positive().optional(),
  durationUnit: z.enum(["hours", "days"]).optional(),
  deliveryDate: z.string().datetime().optional(),
  deliveryWindow: z.string().max(64).optional(),
  message: z.string().min(1).max(2000),
});

const updateBidSchema = createBidSchema.partial().extend({
  message: z.string().min(1).max(2000).optional(),
});

export async function registerBidRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    "/api/v1/posts/:postId/bids",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.userType !== "SHOP") {
        return reply.status(403).send({ error: "Shop account required" });
      }
      const postId = z.object({ postId: z.string().min(1) }).parse(request.params)
        .postId;
      const parsed = createBidSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }

      const shop = await prisma.shop.findUnique({
        where: { userId: request.userId },
      });
      if (!shop) {
        return reply.status(404).send({ error: "Shop not found" });
      }

      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post || post.status !== "ACTIVE" || post.expiresAt <= new Date()) {
        return reply.status(400).send({ error: "Post not open for bids" });
      }

      try {
        const bid = await prisma.bid.create({
          data: {
            postId,
            shopId: shop.id,
            priceEstimate: parsed.data.priceEstimate,
            appointmentDate: parsed.data.appointmentDate
              ? new Date(parsed.data.appointmentDate)
              : undefined,
            appointmentTime: parsed.data.appointmentTime,
            estimatedQty: parsed.data.estimatedQty,
            durationUnit: parsed.data.durationUnit,
            deliveryDate: parsed.data.deliveryDate
              ? new Date(parsed.data.deliveryDate)
              : undefined,
            deliveryWindow: parsed.data.deliveryWindow,
            message: parsed.data.message,
          },
          include: { shop: true },
        });
        void notifyOwnerNewBid(post.userId, post.id).catch((e) =>
          console.error(e),
        );
        return { bid };
      } catch {
        return reply.status(409).send({ error: "Bid already exists for this post" });
      }
    },
  );

  fastify.put(
    "/api/v1/bids/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.userType !== "SHOP") {
        return reply.status(403).send({ error: "Shop account required" });
      }
      const id = z.object({ id: z.string().min(1) }).parse(request.params).id;
      const parsed = updateBidSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }
      const shop = await prisma.shop.findUnique({
        where: { userId: request.userId },
      });
      if (!shop) {
        return reply.status(404).send({ error: "Shop not found" });
      }
      const bid = await prisma.bid.findFirst({
        where: { id, shopId: shop.id, status: "PENDING" },
      });
      if (!bid) {
        return reply.status(404).send({ error: "Bid not found" });
      }
      const d = parsed.data;
      const updated = await prisma.bid.update({
        where: { id },
        data: {
          priceEstimate: d.priceEstimate,
          appointmentDate: d.appointmentDate
            ? new Date(d.appointmentDate)
            : undefined,
          appointmentTime: d.appointmentTime,
          estimatedQty: d.estimatedQty,
          durationUnit: d.durationUnit,
          deliveryDate: d.deliveryDate ? new Date(d.deliveryDate) : undefined,
          deliveryWindow: d.deliveryWindow,
          message: d.message,
        },
      });
      return { bid: updated };
    },
  );

  fastify.delete(
    "/api/v1/bids/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.userType !== "SHOP") {
        return reply.status(403).send({ error: "Shop account required" });
      }
      const id = z.object({ id: z.string().min(1) }).parse(request.params).id;
      const shop = await prisma.shop.findUnique({
        where: { userId: request.userId },
      });
      if (!shop) {
        return reply.status(404).send({ error: "Shop not found" });
      }
      const bid = await prisma.bid.findFirst({
        where: { id, shopId: shop.id, status: "PENDING" },
      });
      if (!bid) {
        return reply.status(404).send({ error: "Bid not found" });
      }
      await prisma.bid.update({
        where: { id },
        data: { status: "WITHDRAWN" },
      });
      return { success: true };
    },
  );

  fastify.post(
    "/api/v1/bids/:id/accept",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.userType !== "OWNER") {
        return reply.status(403).send({ error: "Owner account required" });
      }
      const id = z.object({ id: z.string().min(1) }).parse(request.params).id;

      const txResult = await prisma.$transaction(async (tx) => {
        const bid = await tx.bid.findUnique({
          where: { id },
          include: { post: true, shop: { include: { user: true } } },
        });
        if (!bid || bid.post.userId !== request.userId) {
          return { error: "NOT_FOUND" as const };
        }
        if (bid.post.status !== "ACTIVE") {
          return { error: "POST_NOT_ACTIVE" as const };
        }
        if (bid.status !== "PENDING") {
          return { error: "BID_NOT_PENDING" as const };
        }

        await tx.bid.updateMany({
          where: { postId: bid.postId, id: { not: id } },
          data: { status: "WITHDRAWN" },
        });
        const accepted = await tx.bid.update({
          where: { id },
          data: { status: "ACCEPTED" },
          include: { shop: { include: { user: true } } },
        });
        await tx.post.update({
          where: { id: bid.postId },
          data: { status: "ACCEPTED" },
        });
        const chatThread = await tx.chatThread.create({
          data: { bidId: id },
        });
        return { bid: accepted, chatThread, shopFcm: accepted.shop.user.fcmToken };
      });

      if ("error" in txResult) {
        if (txResult.error === "NOT_FOUND") {
          return reply.status(404).send({ error: "Bid not found" });
        }
        if (txResult.error === "POST_NOT_ACTIVE") {
          return reply.status(400).send({ error: "Post is not active" });
        }
        return reply.status(400).send({ error: "Bid cannot be accepted" });
      }

      if (txResult.shopFcm) {
        try {
          await sendPush(
            txResult.shopFcm,
            "Your bid was accepted",
            "The customer accepted your bid. Open chat to coordinate.",
            { bidId: id, threadId: txResult.chatThread.id, type: "ACCEPT" },
            false,
          );
        } catch {
          /* ignore push errors */
        }
      }

      return {
        bid: txResult.bid,
        chatThread: txResult.chatThread,
      };
    },
  );

  fastify.get(
    "/api/v1/bids/mine",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.userType !== "SHOP") {
        return reply.status(403).send({ error: "Shop account required" });
      }
      const shop = await prisma.shop.findUnique({
        where: { userId: request.userId },
      });
      if (!shop) {
        return reply.status(404).send({ error: "Shop not found" });
      }
      const bids = await prisma.bid.findMany({
        where: { shopId: shop.id },
        include: { post: true },
        orderBy: { createdAt: "desc" },
      });
      return { bids };
    },
  );
}
