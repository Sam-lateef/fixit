import type { FastifyInstance } from "fastify";
import { prisma } from "../db/prisma.js";
import {
  loadDistrictSeedRows,
  upsertDistrictsFromJson,
} from "../lib/catalog-json-seed.js";
import {
  canonicalIraqCityForDistricts,
  parseCityQueryParam,
} from "../lib/iraq-city.js";

/**
 * Lazy bootstrap: when the DB has zero District rows (forgotten seed on a fresh
 * deploy), upsert the full comprehensive list from `prisma/data/districts.json`.
 * One-shot — `existingCount > 0` after the first call means this becomes a no-op.
 */
async function ensureDistrictsSeeded(): Promise<void> {
  const existingCount = await prisma.district.count();
  if (existingCount > 0) {
    return;
  }
  await upsertDistrictsFromJson(prisma);
}

/**
 * Defensive per-city bootstrap: if the DB has *some* districts but the requested
 * governorate has none (e.g. only Baghdad was seeded historically), upsert just
 * the rows for that city. Keeps the worst-case payload of a city's first
 * request to a handful of rows.
 */
async function ensureDistrictsForCityIfEmpty(city: string): Promise<void> {
  const n = await prisma.district.count({ where: { city } });
  if (n > 0) {
    return;
  }
  const rows = loadDistrictSeedRows().filter((d) => d.city === city);
  if (rows.length === 0) {
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
}

export async function registerDistrictRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get("/api/v1/districts", async (request) => {
    await ensureDistrictsSeeded();
    const rawCity = parseCityQueryParam(request.query);
    const city = rawCity ? canonicalIraqCityForDistricts(rawCity) : undefined;
    if (city) {
      await ensureDistrictsForCityIfEmpty(city);
    }
    const districts = await prisma.district.findMany({
      where: city ? { city } : undefined,
      orderBy: [{ city: "asc" }, { name: "asc" }],
    });
    return { districts };
  });
}
