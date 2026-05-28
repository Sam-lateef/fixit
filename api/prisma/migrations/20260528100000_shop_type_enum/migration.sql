-- Shop-type signup redesign — single-step migration.
--
-- Safe to apply as NOT NULL without a backfill because the Shop table was
-- intentionally emptied before this migration shipped (see 2026-05-28 entry
-- in docs/debugs.md). The old per-vehicle boolean grid is dropped in the
-- same step — `shopType` is now the single source of truth for which posts
-- a shop is allowed to see.

-- CreateEnum
CREATE TYPE "ShopType" AS ENUM ('CAR', 'MOTORCYCLE', 'TOWING');

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "shopType" "ShopType" NOT NULL;

-- Drop deprecated per-vehicle / per-delivery booleans. Their meaning is
-- now derived from shopType + offersRepair/offersParts/offersTowing.
ALTER TABLE "Shop" DROP COLUMN "servicesCars";
ALTER TABLE "Shop" DROP COLUMN "servicesMotorcycles";
ALTER TABLE "Shop" DROP COLUMN "deliveryAvailable";
