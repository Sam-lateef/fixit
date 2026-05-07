import type { FastifyInstance } from "fastify";
import { EnforcementReason, MediaStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import {
  createAuditLog,
  safeTrim,
} from "../../services/moderation.js";

const listQuerySchema = z.object({
  status: z.nativeEnum(MediaStatus).optional(),
  take: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().optional(),
});

const updateSchema = z.object({
  reason: z.nativeEnum(EnforcementReason).optional(),
  notes: z.string().max(2000).optional(),
});

export async function registerAdminMediaRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/api/v1/admin/media",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const parsed = listQuerySchema.safeParse(request.query);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid query" });
      const { status, take, cursor } = parsed.data;
      const rows = await prisma.mediaAsset.findMany({
        where: status ? { status } : {},
        orderBy: { createdAt: "desc" },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      const hasMore = rows.length > take;
      const media = hasMore ? rows.slice(0, take) : rows;
      return { media, nextCursor: hasMore ? media[media.length - 1].id : null };
    },
  );

  fastify.post(
    "/api/v1/admin/media/:id/hide",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updateSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });
      const media = await prisma.mediaAsset.update({
        where: { id },
        data: {
          status: "HIDDEN",
          removedAt: new Date(),
          removedById: request.userId,
          reason: parsed.data.reason ?? null,
          notes: safeTrim(parsed.data.notes),
        },
      });
      await createAuditLog({
        actorUserId: request.userId,
        action: "MEDIA_HIDDEN",
        targetType: "POST",
        targetId: media.postId ?? media.id,
        reason: parsed.data.reason ?? null,
        notes: safeTrim(parsed.data.notes),
        metadata: { mediaId: media.id, key: media.key },
      });
      return { media };
    },
  );

  fastify.post(
    "/api/v1/admin/media/:id/restore",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const media = await prisma.mediaAsset.update({
        where: { id },
        data: {
          status: "ACTIVE",
          removedAt: null,
          removedById: null,
          reason: null,
          notes: null,
        },
      });
      await createAuditLog({
        actorUserId: request.userId,
        action: "MEDIA_RESTORED",
        targetType: "POST",
        targetId: media.postId ?? media.id,
        metadata: { mediaId: media.id, key: media.key },
      });
      return { media };
    },
  );
}
