import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { cascadeDeleteUser } from "../../services/delete-user.js";

const listQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  userType: z.enum(["OWNER", "SHOP"]).optional(),
  status: z.enum(["active", "banned"]).optional(),
  take: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export async function registerAdminUserRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/api/v1/admin/users",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const parsed = listQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid query" });
      }
      const { q, userType, status, take, cursor } = parsed.data;

      const where: Prisma.UserWhereInput = {};
      if (userType) where.userType = userType;
      if (status === "banned") where.bannedAt = { not: null };
      if (status === "active") where.bannedAt = null;
      if (q) {
        where.OR = [
          { phone: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ];
      }

      const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          userType: true,
          role: true,
          bannedAt: true,
          createdAt: true,
        },
      });

      const hasMore = users.length > take;
      const items = hasMore ? users.slice(0, take) : users;
      const nextCursor = hasMore ? items[items.length - 1].id : null;
      return { users: items, nextCursor };
    },
  );

  fastify.get(
    "/api/v1/admin/users/:id",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          shop: true,
          _count: { select: { posts: true } },
        },
      });
      if (!user) {
        return reply.status(404).send({ error: "Not found" });
      }
      const bidCount = user.shop
        ? await prisma.bid.count({ where: { shopId: user.shop.id } })
        : 0;
      return { user, counts: { posts: user._count.posts, bids: bidCount } };
    },
  );

  fastify.post(
    "/api/v1/admin/users/:id/ban",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (id === request.userId) {
        return reply.status(400).send({ error: "Cannot ban yourself" });
      }
      const user = await prisma.user.update({
        where: { id },
        data: { bannedAt: new Date() },
        select: { id: true, bannedAt: true },
      });
      return { user };
    },
  );

  fastify.post(
    "/api/v1/admin/users/:id/unban",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = await prisma.user.update({
        where: { id },
        data: { bannedAt: null },
        select: { id: true, bannedAt: true },
      });
      return { user };
    },
  );

  fastify.delete(
    "/api/v1/admin/users/:id",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (id === request.userId) {
        return reply.status(400).send({ error: "Cannot delete yourself" });
      }
      const exists = await prisma.user.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!exists) {
        return reply.status(404).send({ error: "Not found" });
      }
      await cascadeDeleteUser(id);
      return { ok: true };
    },
  );
}
