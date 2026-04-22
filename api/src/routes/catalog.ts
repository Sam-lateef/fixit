import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import {
  upsertCitiesFromJson,
  upsertVehiclesIqFromJson,
} from "../lib/catalog-json-seed.js";

const marketQuery = z.string().min(2).max(8).optional();

async function ensureCitiesBootstrapped(): Promise<void> {
  const n = await prisma.city.count();
  if (n === 0) {
    await upsertCitiesFromJson(prisma);
  }
}

async function ensureIqVehicleCatalogBootstrapped(): Promise<void> {
  const n = await prisma.vehicleMakeMarket.count({
    where: { marketCode: "IQ" },
  });
  if (n === 0) {
    await upsertVehiclesIqFromJson(prisma);
  }
}

export async function registerCatalogRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get("/api/v1/catalog/cities", async () => {
    await ensureCitiesBootstrapped();
    const cities = await prisma.city.findMany({
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    });
    return { cities };
  });

  fastify.get("/api/v1/catalog/makes", async (request) => {
    await ensureCitiesBootstrapped();
    await ensureIqVehicleCatalogBootstrapped();
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
    await ensureIqVehicleCatalogBootstrapped();
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
    await ensureIqVehicleCatalogBootstrapped();
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
