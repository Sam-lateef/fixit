-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'MOTORCYCLE');

-- AlterTable
ALTER TABLE "Post"
  ADD COLUMN "vehicleType" "VehicleType" NOT NULL DEFAULT 'CAR',
  ADD COLUMN "motorcycleDetails" TEXT;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "servicesMotorcycles" BOOLEAN NOT NULL DEFAULT false;
