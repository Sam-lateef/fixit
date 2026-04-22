-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('CARS', 'ELECTRICS', 'PLUMBING', 'METAL', 'WOOD');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "category" "ServiceCategory" NOT NULL DEFAULT 'CARS';

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "category" "ServiceCategory" NOT NULL DEFAULT 'CARS';
