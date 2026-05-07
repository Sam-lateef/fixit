import type { FastifyInstance } from "fastify";
import { EnforcementReason, ReportTargetType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { createAuditLog } from "../services/moderation.js";

const createReportSchema = z.object({
  targetType: z.nativeEnum(ReportTargetType),
  targetId: z.string().min(1),
  reason: z.nativeEnum(EnforcementReason),
  details: z.string().min(1).max(2000).optional(),
});

function resolveReportDetails(
  details: string | undefined,
  targetType: ReportTargetType,
  targetId: string,
): string {
  const trimmed = details?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  return `Reported ${targetType} target ${targetId} from client without custom notes.`;
}

async function targetExists(
  targetType: ReportTargetType,
  targetId: string,
): Promise<boolean> {
  if (targetType === "POST") {
    const row = await prisma.post.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    return Boolean(row);
  }
  if (targetType === "MESSAGE") {
    const row = await prisma.message.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    return Boolean(row);
  }
  const row = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true },
  });
  return Boolean(row);
}

export async function registerReportRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post(
    "/api/v1/reports",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = createReportSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body" });
      }
      const { targetType, targetId, reason, details } = parsed.data;

      if (!(await targetExists(targetType, targetId))) {
        return reply.status(404).send({ error: "Target not found" });
      }
      const existing = await prisma.report.findFirst({
        where: {
          reporterUserId: request.userId,
          targetType,
          targetId,
          status: { in: ["OPEN", "IN_REVIEW"] },
        },
        select: { id: true },
      });
      if (existing) {
        return reply
          .status(409)
          .send({ error: "You already reported this item", reportId: existing.id });
      }

      const report = await prisma.report.create({
        data: {
          reporterUserId: request.userId,
          targetType,
          targetId,
          reason,
          details: resolveReportDetails(details, targetType, targetId),
        },
      });
      await createAuditLog({
        actorUserId: request.userId,
        action: "REPORT_CREATED",
        targetType,
        targetId,
        reason,
        notes: "User-submitted report",
        metadata: { reportId: report.id },
      });
      return { report };
    },
  );
}
