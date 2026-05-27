import type { FastifyInstance } from "fastify";
import { EnforcementReason } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { createAuditLog, safeTrim } from "../../services/moderation.js";

const listQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  take: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
  locked: z.coerce.boolean().optional(),
});

const messageModerationSchema = z.object({
  reason: z.nativeEnum(EnforcementReason),
  notes: z.string().max(2000).optional(),
});

const threadLockSchema = z.object({
  reason: z.nativeEnum(EnforcementReason),
  notes: z.string().max(2000).optional(),
});

export async function registerAdminChatRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/api/v1/admin/threads",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const parsed = listQuerySchema.safeParse(request.query);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid query" });
      const { q, take, cursor, locked } = parsed.data;
      const rows = await prisma.chatThread.findMany({
        where: {
          ...(locked !== undefined
            ? { lockedAt: locked ? { not: null } : null }
            : {}),
          ...(q
            ? {
                OR: [
                  { bid: { post: { description: { contains: q, mode: "insensitive" } } } },
                  { bid: { shop: { name: { contains: q, mode: "insensitive" } } } },
                ],
              }
            : {}),
        },
        include: {
          bid: {
            include: {
              post: { select: { id: true, description: true, userId: true } },
              shop: { select: { id: true, name: true, userId: true } },
            },
          },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      const hasMore = rows.length > take;
      const threads = hasMore ? rows.slice(0, take) : rows;
      return {
        threads,
        nextCursor: hasMore ? threads[threads.length - 1].id : null,
      };
    },
  );

  fastify.get(
    "/api/v1/admin/threads/:id/messages",
    { preHandler: [fastify.requireAdmin] },
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
      const thread = await prisma.chatThread.findUnique({
        where: { id },
        include: {
          bid: {
            include: {
              post: { select: { id: true, userId: true } },
              shop: { select: { id: true, userId: true, name: true } },
            },
          },
        },
      });
      if (!thread) return reply.status(404).send({ error: "Not found" });
      const messages = await prisma.message.findMany({
        where: { threadId: id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      });
      return { thread, messages: messages.reverse() };
    },
  );

  fastify.post(
    "/api/v1/admin/messages/:id/hide",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = messageModerationSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });
      const message = await prisma.message.update({
        where: { id },
        data: {
          hiddenAt: new Date(),
          hiddenById: request.userId,
          hiddenReason: parsed.data.reason,
          hiddenNotes: safeTrim(parsed.data.notes),
        },
      });
      await createAuditLog({
        actorUserId: request.userId,
        action: "MESSAGE_HIDDEN",
        targetType: "MESSAGE",
        targetId: id,
        reason: parsed.data.reason,
        notes: safeTrim(parsed.data.notes),
      });
      return { message };
    },
  );

  fastify.post(
    "/api/v1/admin/messages/:id/unhide",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const message = await prisma.message.update({
        where: { id },
        data: {
          hiddenAt: null,
          hiddenById: null,
          hiddenReason: null,
          hiddenNotes: null,
        },
      });
      await createAuditLog({
        actorUserId: request.userId,
        action: "MESSAGE_UNHIDDEN",
        targetType: "MESSAGE",
        targetId: id,
      });
      return { message };
    },
  );

  fastify.post(
    "/api/v1/admin/threads/:id/lock",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = threadLockSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });
      const thread = await prisma.chatThread.update({
        where: { id },
        data: {
          lockedAt: new Date(),
          lockedById: request.userId,
          lockReason: parsed.data.reason,
          lockNotes: safeTrim(parsed.data.notes),
        },
      });
      await createAuditLog({
        actorUserId: request.userId,
        action: "THREAD_LOCKED",
        targetType: "MESSAGE",
        targetId: id,
        reason: parsed.data.reason,
        notes: safeTrim(parsed.data.notes),
      });
      return { thread };
    },
  );

  fastify.post(
    "/api/v1/admin/threads/:id/unlock",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const thread = await prisma.chatThread.update({
        where: { id },
        data: {
          lockedAt: null,
          lockedById: null,
          lockReason: null,
          lockNotes: null,
        },
      });
      await createAuditLog({
        actorUserId: request.userId,
        action: "THREAD_UNLOCKED",
        targetType: "MESSAGE",
        targetId: id,
      });
      return { thread };
    },
  );
}
