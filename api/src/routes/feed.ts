import type { FastifyInstance } from "fastify";
import { ServiceType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import {
  buildMoreFeedEntries,
  filterPostsForShop,
  resolveShopCityForFeed,
} from "../services/feed-filter.js";

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
          morePage: z.coerce.number().int().min(1).optional(),
          moreLimit: z.coerce.number().int().min(1).max(50).optional(),
        })
        .safeParse(request.query);
      if (!q.success) {
        return reply.status(400).send({ error: "Invalid query" });
      }
      const page = q.data.page ?? 1;
      const limit = q.data.limit ?? 20;
      const morePage = q.data.morePage ?? 1;
      const moreLimit = q.data.moreLimit ?? 25;

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
          // Hide posts the shop has already bid on (PENDING or ACCEPTED).
          // Once they bid, the post lives in the "My Bids" tab — no point
          // showing it in the feed too. WITHDRAWN bids don't exclude so
          // a shop that withdrew can re-bid from the feed.
          NOT: {
            bids: {
              some: { shopId: shop.id, status: { not: "WITHDRAWN" } },
            },
          },
        },
        include: { district: true, user: true, bids: true },
      });

      const matched = filterPostsForShop(shop, posts);
      const start = (page - 1) * limit;
      const slice = matched.slice(start, start + limit);

      const { entries: moreFull, cityMatchedCount } = buildMoreFeedEntries(
        shop,
        posts,
        matched,
      );
      const moreStart = (morePage - 1) * moreLimit;
      const moreSlice = moreFull.slice(moreStart, moreStart + moreLimit);

      const resolvedCity = resolveShopCityForFeed(shop);
      const moreCity = resolvedCity.length > 0 ? resolvedCity : null;
      const moreHasNational = moreFull.length > cityMatchedCount;

      return {
        posts: slice,
        morePosts: moreSlice,
        matchedTotal: matched.length,
        moreTotal: moreFull.length,
        moreCity,
        moreHasNational,
      };
    },
  );
}
