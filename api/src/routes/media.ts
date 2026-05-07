import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { fetchR2ObjectBuffer } from "../services/r2.js";

/**
 * Authenticated proxy for R2 post images. Clients use Fly TLS instead of pub-*.r2.dev
 * (avoids broken / blocked HTTPS to r2.dev on some networks).
 */
export async function registerMediaRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/api/v1/media/:key",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const key = z
        .string()
        .min(1)
        .max(400)
        .parse((request.params as { key: string }).key);
      if (key.includes("..") || !key.startsWith("posts/")) {
        return reply.status(400).send({ error: "Invalid key" });
      }
      const media = await prisma.mediaAsset.findUnique({
        where: { key },
        select: { status: true },
      });
      if (media && media.status !== "ACTIVE") {
        return reply.status(410).send({ error: "Media removed" });
      }
      try {
        const { buffer, contentType } = await fetchR2ObjectBuffer(key);
        void reply.header("Cache-Control", "public, max-age=86400");
        return reply.type(contentType).send(buffer);
      } catch {
        return reply.status(404).send({ error: "Not found" });
      }
    },
  );
}
