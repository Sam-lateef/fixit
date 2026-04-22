import type { FastifyInstance } from "fastify";
import { ServiceType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { filterPostsForShop } from "../services/feed-filter.js";

export async function registerFeedRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/api/v1/feed",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (request.userType !== "SHOP") {
        return reply.status(403).send({ error: "Shop account required" });
      }
      const q = z
        .object({
          serviceType: z.nativeEnum(ServiceType).optional(),
          page: z.coerce.number().int().min(1).optional(),
          limit: z.coerce.number().int().min(1).max(50).optional(),
        })
        .safeParse(request.query);
      if (!q.success) {
        return reply.status(400).send({ error: "Invalid query" });
      }
      const page = q.data.page ?? 1;
      const limit = q.data.limit ?? 20;

      const shop = await prisma.shop.findUnique({
        where: { userId: request.userId },
        include: { user: { include: { district: true } } },
      });
      if (!shop) {
        return reply.status(404).send({ error: "Shop profile not found" });
      }

      const posts = await prisma.post.findMany({
        where: {
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
          category: shop.category,
          ...(q.data.serviceType ? { serviceType: q.data.serviceType } : {}),
        },
        include: { district: true, user: true, bids: true },
      });

      const filtered = filterPostsForShop(shop, posts);
      const start = (page - 1) * limit;
      const slice = filtered.slice(start, start + limit);

      return { posts: slice };
    },
  );
}
