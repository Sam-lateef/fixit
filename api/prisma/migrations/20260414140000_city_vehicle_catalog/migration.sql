-- City catalog + vehicle make/model/year per market (Iraq IQ first).

CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");

CREATE TABLE "VehicleMake" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMake_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VehicleMake_name_key" ON "VehicleMake"("name");

CREATE TABLE "VehicleMakeMarket" (
    "makeId" TEXT NOT NULL,
    "marketCode" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 1000,

    CONSTRAINT "VehicleMakeMarket_pkey" PRIMARY KEY ("makeId","marketCode")
);

CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL,
    "makeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VehicleModel_makeId_name_key" ON "VehicleModel"("makeId", "name");

CREATE TABLE "VehicleModelMarket" (
    "modelId" TEXT NOT NULL,
    "marketCode" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 1000,

    CONSTRAINT "VehicleModelMarket_pkey" PRIMARY KEY ("modelId","marketCode")
);

CREATE TABLE "VehicleModelYear" (
    "modelId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "VehicleModelYear_pkey" PRIMARY KEY ("modelId","year")
);

ALTER TABLE "VehicleMakeMarket" ADD CONSTRAINT "VehicleMakeMarket_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES "VehicleMake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES "VehicleMake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VehicleModelMarket" ADD CONSTRAINT "VehicleModelMarket_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VehicleModelYear" ADD CONSTRAINT "VehicleModelYear_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
