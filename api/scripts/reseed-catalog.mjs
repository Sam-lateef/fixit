// One-shot reseed of the IQ vehicle catalog (cities + districts + makes/models).
// Plain ESM JS so it runs in the pruned production image (no tsx, no TS).
//
// Usage (locally):     node api/scripts/reseed-catalog.mjs
// Usage (Fly prod):    fly ssh console --app fixit-api -C 'cd /repo/api && node scripts/reseed-catalog.mjs'
//
// Idempotent — every upsert keys on its natural unique constraint
// (City.slug, District.@@unique(city,name), VehicleMake.name, etc.) so
// existing user/shop foreign keys are preserved and re-running is a no-op
// when nothing changed.
//
// Imports the built dist output (the helpers themselves live in
// src/lib/catalog-json-seed.ts → dist/lib/catalog-json-seed.js after `tsc`).
import { PrismaClient } from "@prisma/client";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  upsertCitiesFromJson,
  upsertDistrictsFromJson,
  upsertVehiclesIqFromJson,
} from "../dist/lib/catalog-json-seed.js";

// The upsert helpers compute file paths via process.cwd() + "prisma/data/...".
// Force cwd to the api package root regardless of where the script is invoked
// from, so the data files resolve to api/prisma/data/* on both dev and prod.
const here = dirname(fileURLToPath(import.meta.url));
const apiRoot = join(here, "..");
process.chdir(apiRoot);

const prisma = new PrismaClient();

async function main() {
  const t0 = Date.now();
  console.log("[reseed-catalog] cwd:", process.cwd());

  console.log("[reseed-catalog] upserting cities …");
  await upsertCitiesFromJson(prisma);

  console.log("[reseed-catalog] upserting districts …");
  await upsertDistrictsFromJson(prisma);

  console.log("[reseed-catalog] upserting vehicles (IQ) …");
  await upsertVehiclesIqFromJson(prisma);

  const ms = Date.now() - t0;
  console.log(`[reseed-catalog] done in ${ms} ms`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("[reseed-catalog] FAILED:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
