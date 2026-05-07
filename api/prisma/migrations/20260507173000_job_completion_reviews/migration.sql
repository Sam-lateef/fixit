-- AlterTable
ALTER TABLE "User"
ADD COLUMN "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "reviewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ChatThread"
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "completedById" TEXT;

-- CreateTable
CREATE TABLE "JobReview" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "reviewerUserId" TEXT NOT NULL,
  "revieweeUserId" TEXT NOT NULL,
  "stars" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobReview_threadId_reviewerUserId_key" ON "JobReview"("threadId", "reviewerUserId");
CREATE INDEX "JobReview_revieweeUserId_createdAt_idx" ON "JobReview"("revieweeUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JobReview" ADD CONSTRAINT "JobReview_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JobReview" ADD CONSTRAINT "JobReview_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JobReview" ADD CONSTRAINT "JobReview_revieweeUserId_fkey" FOREIGN KEY ("revieweeUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
