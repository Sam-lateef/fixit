import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { safePreview } from "../lib/safe-preview.js";
import { sendPush } from "../services/fcm.js";
import { pushNewMessageTitle, resolvePushLocale } from "../services/push-i18n.js";

const listThreadsQuerySchema = z.object({
  state: z.enum(["ACTIVE", "COMPLETED"]).optional(),
});

const submitReviewSchema = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

type ThreadParticipantIds = {
  ownerUserId: string;
  shopUserId: string;
};

function resolveRevieweeUserId(
  reviewerUserId: string,
  participants: ThreadParticipantIds,
): string | null {
  if (reviewerUserId === participants.ownerUserId) {
    return participants.shopUserId;
  }
  if (reviewerUserId === participants.shopUserId) {
    return participants.ownerUserId;
  }
  return null;
}

async function recomputeUserRating(userId: string): Promise<void> {
  const aggregate = await prisma.jobReview.aggregate({
    where: { revieweeUserId: userId },
    _avg: { stars: true },
    _count: { _all: true },
  });
  const reviewCount = aggregate._count._all;
  const rating = aggregate._avg.stars ?? 0;
  await prisma.user.update({
    where: { id: userId },
    data: { rating, reviewCount },
  });
}

async function recomputeShopRating(shopUserId: string): Promise<void> {
  const shop = await prisma.shop.findUnique({
    where: { userId: shopUserId },
    select: { id: true },
  });
  if (!shop) {
    return;
  }
  const aggregate = await prisma.jobReview.aggregate({
    where: { revieweeUserId: shopUserId },
    _avg: { stars: true },
    _count: { _all: true },
  });
  const reviewCount = aggregate._count._all;
  const rating = aggregate._avg.stars ?? 0;
  await prisma.shop.update({
    where: { id: shop.id },
    data: { rating, reviewCount },
  });
}

export function registerChatRoutes(
  fastify: FastifyInstance,
  getIo: () => { emitNewMessage: (threadId: string, message: unknown) => void },
): void {
  fastify.get(
    "/api/v1/threads",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const queryParsed = listThreadsQuerySchema.safeParse(request.query);
      if (!queryParsed.success) {
        return reply.status(400).send({ error: "Invalid query" });
      }
      const state = queryParsed.data.state ?? "ACTIVE";
      const threads = await prisma.chatThread.findMany({
        where: {
          completedAt: state === "COMPLETED" ? { not: null } : null,
          bid: {
            OR: [
              { post: { userId: request.userId } },
              { shop: { userId: request.userId } },
            ],
          },
        },
        include: {
          bid: {
            include: {
              post: { include: { user: { select: { id: true, name: true } } } },
              shop: { include: { user: { select: { id: true, name: true } } } },
            },
          },
          reviews: true,
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
      });
      // Count unread messages per thread (sent by someone else, not yet read)
      const unreadCounts = await prisma.message.groupBy({
        by: ["threadId"],
        where: {
          threadId: { in: threads.map((t) => t.id) },
          senderId: { not: request.userId },
          readAt: null,
        },
        _count: { id: true },
      });
      const unreadMap = new Map(
        unreadCounts.map((r) => [r.threadId, r._count.id]),
      );

      const mapped = threads.map(({ messages, ...rest }) => ({
        ...rest,
        lastMessage: messages[0] ?? null,
        unreadCount: unreadMap.get(rest.id) ?? 0,
      }));
      return { threads: mapped };
    },
  );

  fastify.get(
    "/api/v1/threads/:id/messages",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().min(1) })
        .safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(400).send({ error: "Invalid thread id" });
      }
      const { id } = parsedParams.data;
      const q = z
        .object({
          page: z.coerce.number().int().min(1).optional(),
          limit: z.coerce.number().int().min(1).max(100).optional(),
        })
        .safeParse(request.query);
      if (!q.success) {
        return reply.status(400).send({ error: "Invalid query" });
      }
      const page = q.data.page ?? 1;
      const limit = q.data.limit ?? 50;

      const thread = await prisma.chatThread.findFirst({
        where: {
          id,
          bid: {
            OR: [
              { post: { userId: request.userId } },
              { shop: { userId: request.userId } },
            ],
          },
        },
        include: {
          bid: {
            include: {
              post: { include: { user: { select: { id: true, name: true } } } },
              shop: { include: { user: { select: { id: true, name: true } } } },
            },
          },
          reviews: true,
        },
      });
      if (!thread) {
        return reply.status(404).send({ error: "Thread not found" });
      }
      const messages = await prisma.message.findMany({
        where: { threadId: id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      });
      return {
        thread,
        messages: messages
          .reverse()
          .map((message) =>
            message.hiddenAt
              ? { ...message, content: "[Message hidden by moderation]" }
              : message,
          ),
      };
    },
  );

  fastify.post(
    "/api/v1/threads/:id/messages",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().min(1) })
        .safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(400).send({ error: "Invalid thread id" });
      }
      const { id } = parsedParams.data;
      const body = z
        .object({ content: z.string().min(1).max(4000) })
        .safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: "Invalid body" });
      }

      const thread = await prisma.chatThread.findFirst({
        where: {
          id,
          bid: {
            OR: [
              { post: { userId: request.userId } },
              { shop: { userId: request.userId } },
            ],
          },
        },
        include: {
          bid: {
            include: {
              post: { include: { user: true } },
              shop: { include: { user: true } },
            },
          },
        },
      });
      if (!thread) {
        return reply.status(404).send({ error: "Thread not found" });
      }
      if (thread.lockedAt || thread.completedAt) {
        return reply.status(403).send({ error: "Thread is locked by moderation" });
      }

      const message = await prisma.message.create({
        data: {
          threadId: id,
          senderId: request.userId,
          content: body.data.content,
        },
      });

      getIo().emitNewMessage(id, message);

      const ownerId = thread.bid.post.userId;
      const shopUserId = thread.bid.shop.userId;
      const recipientId = request.userId === ownerId ? shopUserId : ownerId;
      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
      });
      if (recipient?.fcmToken) {
        try {
          const loc = resolvePushLocale(recipient.preferredLocale);
          await sendPush(
            recipient.fcmToken,
            pushNewMessageTitle(loc),
            safePreview(body.data.content, 80),
            { threadId: id, type: "CHAT" },
            true,
          );
        } catch {
          /* ignore */
        }
      }

      return { message };
    },
  );

  fastify.post(
    "/api/v1/threads/:id/complete",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().min(1) })
        .safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(400).send({ error: "Invalid thread id" });
      }
      const { id } = parsedParams.data;
      const thread = await prisma.chatThread.findFirst({
        where: {
          id,
          bid: {
            OR: [
              { post: { userId: request.userId } },
              { shop: { userId: request.userId } },
            ],
          },
        },
      });
      if (!thread) {
        return reply.status(404).send({ error: "Thread not found" });
      }
      if (thread.completedAt) {
        return { success: true, completedAt: thread.completedAt };
      }
      const updated = await prisma.chatThread.update({
        where: { id },
        data: {
          completedAt: new Date(),
          completedById: request.userId,
        },
      });
      return { success: true, completedAt: updated.completedAt };
    },
  );

  fastify.post(
    "/api/v1/threads/:id/reviews",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().min(1) })
        .safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(400).send({ error: "Invalid thread id" });
      }
      const { id } = parsedParams.data;
      const parsed = submitReviewSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }
      const thread = await prisma.chatThread.findFirst({
        where: {
          id,
          bid: {
            OR: [
              { post: { userId: request.userId } },
              { shop: { userId: request.userId } },
            ],
          },
        },
        include: {
          bid: {
            include: {
              post: { select: { userId: true } },
              shop: { select: { userId: true } },
            },
          },
        },
      });
      if (!thread) {
        return reply.status(404).send({ error: "Thread not found" });
      }
      if (!thread.completedAt) {
        return reply.status(400).send({ error: "Complete the job before rating" });
      }
      const participants: ThreadParticipantIds = {
        ownerUserId: thread.bid.post.userId,
        shopUserId: thread.bid.shop.userId,
      };
      const revieweeUserId = resolveRevieweeUserId(request.userId, participants);
      if (!revieweeUserId) {
        return reply.status(403).send({ error: "Forbidden" });
      }
      const review = await prisma.jobReview.upsert({
        where: {
          threadId_reviewerUserId: {
            threadId: id,
            reviewerUserId: request.userId,
          },
        },
        update: {
          stars: parsed.data.stars,
          comment: parsed.data.comment && parsed.data.comment.length > 0
            ? parsed.data.comment
            : null,
        },
        create: {
          threadId: id,
          reviewerUserId: request.userId,
          revieweeUserId,
          stars: parsed.data.stars,
          comment: parsed.data.comment && parsed.data.comment.length > 0
            ? parsed.data.comment
            : null,
        },
      });
      if (revieweeUserId === participants.shopUserId) {
        await recomputeShopRating(revieweeUserId);
      }
      await recomputeUserRating(revieweeUserId);
      return { review };
    },
  );
}
