CREATE TABLE "PendingOtp" (
    "phone" TEXT NOT NULL,
    "pinId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingOtp_pkey" PRIMARY KEY ("phone")
);
