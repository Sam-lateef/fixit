import type { FastifyInstance } from "fastify";
import { EnforcementReason, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { createAuditLog, safeTrim } from "../../services/moderation.js";

const listQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  status: z.enum(["ACTIVE", "ACCEPTED", "EXPIRED", "DELETED"]).optional(),
  serviceType: z.enum(["REPAIR", "PARTS", "TOWING"]).optional(),
  userId: z.string().optional(),
  take: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export async function registerAdminPostRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const takedownSchema = z.object({
    reason: z.nativeEnum(EnforcementReason).optional(),
    notes: z.string().max(2000).optional(),
  });
  fastify.get(
    "/api/v1/admin/posts",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const parsed = listQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid query" });
      }
      const { q, status, serviceType, userId, take, cursor } = parsed.data;

      const where: Prisma.PostWhereInput = {};
      if (status) where.status = status;
      if (serviceType) where.serviceType = serviceType;
      if (userId) where.userId = userId;
      if (q) {
        where.OR = [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { carMake: { contains: q, mode: "insensitive" } },
          { carModel: { contains: q, mode: "insensitive" } },
        ];
      }

      const posts = await prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          user: { select: { id: true, name: true, phone: true } },
          _count: { select: { bids: true } },
        },
      });

      const hasMore = posts.length > take;
      const items = hasMore ? posts.slice(0, take) : posts;
      const nextCursor = hasMore ? items[items.length - 1].id : null;
      return { posts: items, nextCursor };
    },
  );

  fastify.get(
    "/api/v1/admin/posts/:id",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
          district: true,
          bids: {
            orderBy: { createdAt: "desc" },
            include: {
              shop: { select: { id: true, name: true } },
            },
          },
        },
      });
      if (!post) {
        return reply.status(404).send({ error: "Not found" });
      }
      return { post };
    },
  );

  fastify.delete(
    "/api/v1/admin/posts/:id",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = takedownSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body" });
      }
      try {
        await prisma.post.update({
          where: { id },
          data: {
            status: "DELETED",
            takedownReason: parsed.data.reason ?? null,
            takedownNotes: safeTrim(parsed.data.notes),
          },
        });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2025"
        ) {
          return reply.status(404).send({ error: "Not found" });
        }
        throw e;
      }
      await createAuditLog({
        actorUserId: request.userId,
        action: "POST_TAKEDOWN",
        targetType: "POST",
        targetId: id,
        reason: parsed.data.reason ?? null,
        notes: safeTrim(parsed.data.notes),
      });
      return { ok: true };
    },
  );
}
