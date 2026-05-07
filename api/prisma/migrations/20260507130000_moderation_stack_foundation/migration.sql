-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('USER', 'POST', 'MESSAGE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'ACTION_TAKEN', 'DISMISSED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "ReportPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM (
  'REPORT_CREATED',
  'REPORT_ASSIGNED',
  'REPORT_RESOLVED',
  'USER_BANNED',
  'USER_UNBANNED',
  'USER_DELETED',
  'POST_TAKEDOWN',
  'POST_RESTORED',
  'MESSAGE_HIDDEN',
  'MESSAGE_UNHIDDEN',
  'THREAD_LOCKED',
  'THREAD_UNLOCKED',
  'MEDIA_HIDDEN',
  'MEDIA_RESTORED'
);

-- CreateEnum
CREATE TYPE "EnforcementReason" AS ENUM (
  'SPAM',
  'SCAM_FRAUD',
  'HARASSMENT',
  'HATE',
  'SEXUAL_CONTENT',
  'VIOLENCE_THREAT',
  'IMPERSONATION',
  'PRIVATE_INFO',
  'ILLEGAL_CONTENT',
  'OFF_PLATFORM_CONDUCT',
  'OTHER'
);

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "bannedReason" "EnforcementReason",
ADD COLUMN "bannedNotes" TEXT;

-- AlterTable
ALTER TABLE "Post"
ADD COLUMN "takedownReason" "EnforcementReason",
ADD COLUMN "takedownNotes" TEXT;

-- AlterTable
ALTER TABLE "ChatThread"
ADD COLUMN "lockedAt" TIMESTAMP(3),
ADD COLUMN "lockedById" TEXT,
ADD COLUMN "lockReason" "EnforcementReason",
ADD COLUMN "lockNotes" TEXT;

-- AlterTable
ALTER TABLE "Message"
ADD COLUMN "hiddenAt" TIMESTAMP(3),
ADD COLUMN "hiddenById" TEXT,
ADD COLUMN "hiddenReason" "EnforcementReason",
ADD COLUMN "hiddenNotes" TEXT;

-- CreateTable
CREATE TABLE "Report" (
  "id" TEXT NOT NULL,
  "reporterUserId" TEXT NOT NULL,
  "targetType" "ReportTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" "EnforcementReason" NOT NULL,
  "details" TEXT,
  "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "ReportPriority" NOT NULL DEFAULT 'NORMAL',
  "assigneeId" TEXT,
  "resolutionNotes" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" "ModerationAction" NOT NULL,
  "targetType" "ReportTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" "EnforcementReason",
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "ownerUserId" TEXT,
  "postId" TEXT,
  "url" TEXT NOT NULL,
  "mimeType" TEXT,
  "status" "MediaStatus" NOT NULL DEFAULT 'ACTIVE',
  "removedAt" TIMESTAMP(3),
  "removedById" TEXT,
  "reason" "EnforcementReason",
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");
CREATE INDEX "AuditLog_targetType_targetId_createdAt_idx" ON "AuditLog"("targetType", "targetId", "createdAt");
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");
CREATE UNIQUE INDEX "MediaAsset_key_key" ON "MediaAsset"("key");
CREATE INDEX "MediaAsset_status_createdAt_idx" ON "MediaAsset"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_hiddenById_fkey" FOREIGN KEY ("hiddenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
