-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('OWNER', 'SHOP');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('REPAIR', 'PARTS', 'TOWING');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('ACTIVE', 'ACCEPTED', 'EXPIRED', 'DELETED');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "cityAr" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "userType" "UserType" NOT NULL,
    "city" TEXT,
    "districtId" TEXT,
    "address" TEXT,
    "fcmToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "offersRepair" BOOLEAN NOT NULL DEFAULT false,
    "offersParts" BOOLEAN NOT NULL DEFAULT false,
    "offersTowing" BOOLEAN NOT NULL DEFAULT false,
    "repairRadiusKm" INTEGER NOT NULL DEFAULT 15,
    "partsRadiusKm" INTEGER NOT NULL DEFAULT 20,
    "towingRadiusKm" INTEGER NOT NULL DEFAULT 8,
    "partsNationwide" BOOLEAN NOT NULL DEFAULT false,
    "deliveryAvailable" BOOLEAN NOT NULL DEFAULT false,
    "carMakes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "carYearMin" INTEGER,
    "carYearMax" INTEGER,
    "repairCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "partsCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "bidsWon" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "repairCategory" TEXT,
    "partsCategory" TEXT,
    "carMake" TEXT,
    "carModel" TEXT,
    "carYear" INTEGER,
    "conditionNew" BOOLEAN NOT NULL DEFAULT false,
    "conditionUsed" BOOLEAN NOT NULL DEFAULT false,
    "deliveryNeeded" BOOLEAN NOT NULL DEFAULT false,
    "towingFromLat" DOUBLE PRECISION,
    "towingFromLng" DOUBLE PRECISION,
    "towingFromAddress" TEXT,
    "towingToAddress" TEXT,
    "urgency" TEXT,
    "districtId" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "description" TEXT NOT NULL,
    "photoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "PostStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "priceEstimate" INTEGER NOT NULL,
    "appointmentDate" TIMESTAMP(3),
    "appointmentTime" TEXT,
    "estimatedQty" INTEGER,
    "durationUnit" TEXT,
    "deliveryDate" TIMESTAMP(3),
    "deliveryWindow" TEXT,
    "message" TEXT NOT NULL,
    "status" "BidStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopNotifyBatch" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopNotifyBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_userId_key" ON "Shop"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_postId_shopId_key" ON "Bid"("postId", "shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatThread_bidId_key" ON "ChatThread"("bidId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopNotifyBatch_shopId_key" ON "ShopNotifyBatch"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "District_city_name_key" ON "District"("city", "name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
