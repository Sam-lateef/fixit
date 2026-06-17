import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import {
  loadDistrictSeedRows,
  upsertDistrictsFromJson,
} from "../lib/catalog-json-seed.js";

// See note in routes/catalog.ts — `prisma` is the $extends-wrapped client
// (slow-op probe) and its type isn't directly assignable to PrismaClient,
// but the model methods are identical. Cast just for the seed-helper call.
const seedDb = prisma as unknown as PrismaClient;
import {
  canonicalIraqCityForDistricts,
  parseCityQueryParam,
} from "../lib/iraq-city.js";

/**
 * Cache of canonical city names already verified to have ≥1 district in this
 * process. Avoids the per-request `prisma.district.count` round-trip that was
 * adding 1 extra DB query to every /districts call (see Docs/debugs.md
 * "Prisma pool starvation 2026-06-08" — a tiny pool on Fly shared-cpu-1x
 * compounded with this extra round-trip).
 */
const knownPopulatedCities = new Set<string>();

/**
 * Single-flight guard so two concurrent first-requests for the same brand-new
 * city don't both run the per-city upsert.
 */
const inFlightCitySeed = new Map<string, Promise<void>>();

/**
 * One-shot bootstrap called from `buildApp()` at startup.
 *
 * If the District table is empty (fresh DB, forgotten `prisma db seed`),
 * upsert the full comprehensive list from `prisma/data/districts.json`. This
 * used to run on every `/api/v1/districts` request — moved to boot so the
 * request path stays free of bootstrap work entirely.
 */
export async function bootstrapDistrictsIfEmpty(): Promise<void> {
  const existingCount = await prisma.district.count();
  if (existingCount > 0) {
    return;
  }
  await upsertDistrictsFromJson(seedDb);
}

/**
 * Defensive per-city lazy fallback for the case where `districts.json` grew
 * with new governorates but `db:seed` hasn't been re-run on prod yet
 * (`bootstrapDistrictsIfEmpty` is a no-op once any city has ≥1 row, so newly
 * added governorates would otherwise be invisible).
 *
 * Once a city is confirmed populated (or confirmed unknown), it's added to
 * `knownPopulatedCities` and subsequent requests skip the check entirely.
 */
async function ensureDistrictsForCity(city: string): Promise<void> {
  if (knownPopulatedCities.has(city)) {
    return;
  }
  const existing = inFlightCitySeed.get(city);
  if (existing) {
    await existing;
    return;
  }
  const promise = (async () => {
    try {
      const n = await prisma.district.count({ where: { city } });
      if (n > 0) {
        knownPopulatedCities.add(city);
        return;
      }
      const rows = loadDistrictSeedRows().filter((d) => d.city === city);
      if (rows.length === 0) {
        // Unknown city in the canonical map — cache anyway so we don't
        // re-count on every request for an unsupported city.
        knownPopulatedCities.add(city);
        return;
      }
      for (const d of rows) {
        await prisma.district.upsert({
          where: { city_name: { city: d.city, name: d.name } },
          create: {
            name: d.name,
            nameAr: d.nameAr,
            city: d.city,
            cityAr: d.cityAr,
            lat: d.lat,
            lng: d.lng,
          },
          update: {
            nameAr: d.nameAr,
            cityAr: d.cityAr,
            lat: d.lat,
            lng: d.lng,
          },
        });
      }
      knownPopulatedCities.add(city);
    } finally {
      inFlightCitySeed.delete(city);
    }
  })();
  inFlightCitySeed.set(city, promise);
  await promise;
}

export async function registerDistrictRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get("/api/v1/districts", async (request) => {
    const rawCity = parseCityQueryParam(request.query);
    const city = rawCity ? canonicalIraqCityForDistricts(rawCity) : undefined;
    if (city) {
      await ensureDistrictsForCity(city);
    }
    const districts = await prisma.district.findMany({
      where: city ? { city } : undefined,
      orderBy: [{ city: "asc" }, { name: "asc" }],
    });
    return { districts };
  });
}
