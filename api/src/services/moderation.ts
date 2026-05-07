import { prisma } from "../db/prisma.js";
import type {
  EnforcementReason,
  Prisma,
  ModerationAction,
  ReportTargetType,
} from "@prisma/client";

export async function createAuditLog(input: {
  actorUserId: string;
  action: ModerationAction;
  targetType: ReportTargetType;
  targetId: string;
  reason?: EnforcementReason | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export function safeTrim(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
