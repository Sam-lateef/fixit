import type { FastifyInstance } from "fastify";
import {
  EnforcementReason,
  ReportPriority,
  ReportStatus,
  ReportTargetType,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { createAuditLog, safeTrim } from "../../services/moderation.js";

const listQuerySchema = z.object({
  status: z.nativeEnum(ReportStatus).optional(),
  targetType: z.nativeEnum(ReportTargetType).optional(),
  reason: z.nativeEnum(EnforcementReason).optional(),
  priority: z.nativeEnum(ReportPriority).optional(),
  take: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

const decisionSchema = z.object({
  decision: z.enum(["ACTION_TAKEN", "DISMISSED", "DUPLICATE"]),
  reason: z.nativeEnum(EnforcementReason).optional(),
  resolutionNotes: z.string().max(2000).optional(),
});

export async function registerAdminReportRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/api/v1/admin/reports",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const parsed = listQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid query" });
      }
      const { status, targetType, reason, priority, take, cursor } = parsed.data;
      const rows = await prisma.report.findMany({
        where: {
          ...(status ? { status } : {}),
          ...(targetType ? { targetType } : {}),
          ...(reason ? { reason } : {}),
          ...(priority ? { priority } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          reporter: { select: { id: true, name: true, phone: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
      });
      const hasMore = rows.length > take;
      const reports = hasMore ? rows.slice(0, take) : rows;
      return {
        reports,
        nextCursor: hasMore ? reports[reports.length - 1].id : null,
      };
    },
  );

  fastify.get(
    "/api/v1/admin/reports/:id",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const report = await prisma.report.findUnique({
        where: { id },
        include: {
          reporter: { select: { id: true, name: true, phone: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
      });
      if (!report) {
        return reply.status(404).send({ error: "Not found" });
      }
      const targetContext =
        report.targetType === "MESSAGE"
          ? await prisma.message.findUnique({
              where: { id: report.targetId },
              select: { id: true, threadId: true },
            })
          : null;
      const audit = await prisma.auditLog.findMany({
        where: { targetType: report.targetType, targetId: report.targetId },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
      return { report, audit, targetContext };
    },
  );

  fastify.post(
    "/api/v1/admin/reports/:id/claim",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const report = await prisma.report.update({
        where: { id },
        data: { assigneeId: request.userId, status: "IN_REVIEW" },
      });
      await createAuditLog({
        actorUserId: request.userId,
        action: "REPORT_ASSIGNED",
        targetType: report.targetType,
        targetId: report.targetId,
        notes: `Claimed report ${id}`,
        metadata: { reportId: id },
      });
      return { report };
    },
  );

  fastify.post(
    "/api/v1/admin/reports/:id/release",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const report = await prisma.report.update({
        where: { id },
        data: { assigneeId: null, status: "OPEN" },
      });
      await createAuditLog({
        actorUserId: request.userId,
        action: "REPORT_ASSIGNED",
        targetType: report.targetType,
        targetId: report.targetId,
        notes: `Released report ${id}`,
        metadata: { reportId: id },
      });
      return { report };
    },
  );

  fastify.post(
    "/api/v1/admin/reports/:id/resolve",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = decisionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid body" });
      }
      const body = parsed.data;
      const report = await prisma.report.update({
        where: { id },
        data: {
          status: body.decision,
          assigneeId: request.userId,
          resolvedAt: new Date(),
          resolutionNotes: safeTrim(body.resolutionNotes),
        },
      });

      await createAuditLog({
        actorUserId: request.userId,
        action: "REPORT_RESOLVED",
        targetType: report.targetType,
        targetId: report.targetId,
        reason: body.reason ?? report.reason,
        notes: safeTrim(body.resolutionNotes) ?? `Resolved as ${body.decision}`,
        metadata: { reportId: id, decision: body.decision },
      });
      return { report };
    },
  );
}
