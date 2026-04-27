-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "servedDistrictIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
