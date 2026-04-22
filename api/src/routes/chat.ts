import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { sendPush } from "../services/fcm.js";

export function registerChatRoutes(
  fastify: FastifyInstance,
  getIo: () => { emitNewMessage: (threadId: string, message: unknown) => void },
): void {
  fastify.get(
    "/api/v1/threads",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const threads = await prisma.chatThread.findMany({
        where: {
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
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
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
      const id = z.object({ id: z.string().min(1) }).parse(request.params).id;
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
      return { messages: messages.reverse() };
    },
  );

  fastify.post(
    "/api/v1/threads/:id/messages",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const id = z.object({ id: z.string().min(1) }).parse(request.params).id;
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
          await sendPush(
            recipient.fcmToken,
            "New message",
            body.data.content.slice(0, 80),
            { threadId: id, type: "CHAT" },
            false,
          );
        } catch {
          /* ignore */
        }
      }

      return { message };
    },
  );
}
