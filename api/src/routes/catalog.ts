import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import {
  upsertCitiesFromJson,
  upsertVehiclesIqFromJson,
} from "../lib/catalog-json-seed.js";

// `prisma` is the $extends-wrapped client (see db/prisma.ts slow-op probe).
// Its type loses $on/$use/$extends but every model method is identical to
// the raw client. The seed helpers below are typed as PrismaClient (they're
// also called from prisma/seed.ts and scripts/reseed-catalog.mjs with a raw
// client), so we cast at the call site rather than rewriting their signatures.
const seedDb = prisma as unknown as PrismaClient;

const marketQuery = z.string().min(2).max(8).optional();

/**
 * One-shot bootstrap called from `buildApp()` at startup.
 *
 * If the cities or IQ vehicle catalog tables are empty (fresh DB, forgotten
 * `prisma db seed`), upsert from the seed JSON files. This used to run on
 * every `/api/v1/catalog/*` request — moved to boot so each request no longer
 * pays an extra `count()` round-trip that compounded the small Prisma pool
 * on Fly shared-cpu-1x (see Docs/debugs.md "Prisma pool starvation 2026-06-08").
 *
 * Both checks are no-ops when tables already have rows; the expensive
 * ~4000-upsert IQ vehicle path only fires on a fresh DB and only once per
 * machine lifetime.
 */
export async function bootstrapCatalogIfEmpty(): Promise<void> {
  const [cityCount, iqMakeCount] = await Promise.all([
    prisma.city.count(),
    prisma.vehicleMakeMarket.count({ where: { marketCode: "IQ" } }),
  ]);
  if (cityCount === 0) {
    await upsertCitiesFromJson(seedDb);
  }
  if (iqMakeCount === 0) {
    await upsertVehiclesIqFromJson(seedDb);
  }
}

export async function registerCatalogRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get("/api/v1/catalog/cities", async () => {
    const cities = await prisma.city.findMany({
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    });
    return { cities };
  });

  fastify.get("/api/v1/catalog/makes", async (request) => {
    const q = z.object({ market: marketQuery }).safeParse(request.query);
    const market = q.success ? (q.data.market ?? "IQ") : "IQ";

    const rows = await prisma.vehicleMakeMarket.findMany({
      where: { marketCode: market },
      include: { make: true },
      orderBy: [{ sortOrder: "asc" }, { make: { name: "asc" } }],
    });

    return {
      makes: rows.map((r) => ({
        id: r.make.id,
        name: r.make.name,
        nameAr: r.make.nameAr,
      })),
    };
  });

  fastify.get("/api/v1/catalog/models", async (request, reply) => {
    const q = z
      .object({
        makeId: z.string().min(1),
        market: marketQuery,
      })
      .safeParse(request.query);
    if (!q.success) {
      return reply.code(400).send({ error: "makeId required" });
    }
    const market = q.data.market ?? "IQ";
    const { makeId } = q.data;

    const rows = await prisma.vehicleModelMarket.findMany({
      where: { marketCode: market, model: { makeId } },
      include: { model: true },
      orderBy: [{ sortOrder: "asc" }, { model: { name: "asc" } }],
    });

    return {
      models: rows.map((r) => ({
        id: r.model.id,
        name: r.model.name,
        nameAr: r.model.nameAr,
      })),
    };
  });

  fastify.get("/api/v1/catalog/years", async (request, reply) => {
    const q = z
      .object({ modelId: z.string().min(1) })
      .safeParse(request.query);
    if (!q.success) {
      return reply.code(400).send({ error: "modelId required" });
    }

    const rows = await prisma.vehicleModelYear.findMany({
      where: { modelId: q.data.modelId },
      orderBy: { year: "desc" },
    });

    return { years: rows.map((r) => r.year) };
  });
}
