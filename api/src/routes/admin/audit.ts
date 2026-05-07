import type { FastifyInstance } from "fastify";
import { ModerationAction, ReportTargetType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";

const querySchema = z.object({
  action: z.nativeEnum(ModerationAction).optional(),
  targetType: z.nativeEnum(ReportTargetType).optional(),
  targetId: z.string().optional(),
  actorUserId: z.string().optional(),
  take: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export async function registerAdminAuditRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/api/v1/admin/audit-logs",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const parsed = querySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid query" });
      }
      const { action, targetType, targetId, actorUserId, take, cursor } = parsed.data;
      const rows = await prisma.auditLog.findMany({
        where: {
          ...(action ? { action } : {}),
          ...(targetType ? { targetType } : {}),
          ...(targetId ? { targetId } : {}),
          ...(actorUserId ? { actorUserId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      const hasMore = rows.length > take;
      const logs = hasMore ? rows.slice(0, take) : rows;
      return { logs, nextCursor: hasMore ? logs[logs.length - 1].id : null };
    },
  );
}
