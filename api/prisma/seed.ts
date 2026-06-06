import { PrismaClient } from "@prisma/client";

import {
  upsertCitiesFromJson,
  upsertDistrictsFromJson,
  upsertVehiclesIqFromJson,
} from "../src/lib/catalog-json-seed.js";

/**
 * Seed entry point. All catalog data lives under `prisma/data/*.json` — see
 * `src/lib/catalog-json-seed.ts` for the upsert helpers (idempotent on each
 * model's natural key).
 *
 * Re-run safely: each upsert keys on its natural unique constraint
 * (`District.@@unique([city, name])`, `City.slug`, `VehicleMake.name`, etc.),
 * so existing user/shop `districtId` foreign keys are preserved.
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  await upsertCitiesFromJson(prisma);
  await upsertDistrictsFromJson(prisma);
  await upsertVehiclesIqFromJson(prisma);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
