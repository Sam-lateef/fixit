import type { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function dataPath(name: string): string {
  return join(process.cwd(), "prisma", "data", name);
}

type CitySeedRow = {
  slug: string;
  nameEn: string;
  nameAr: string;
  sortOrder: number;
};

type VehicleSeedModel = {
  name: string;
  nameAr?: string;
  sortOrder: number;
  yearFrom: number;
  yearTo: number;
};

type VehicleSeedMake = {
  name: string;
  nameAr?: string;
  sortOrder: number;
  models: VehicleSeedModel[];
};

type VehicleSeedFile = {
  marketCode: string;
  makes: VehicleSeedMake[];
};

export async function upsertCitiesFromJson(db: PrismaClient): Promise<void> {
  const raw = readFileSync(dataPath("cities.json"), "utf8");
  const rows = JSON.parse(raw) as CitySeedRow[];
  for (const c of rows) {
    await db.city.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        nameEn: c.nameEn,
        nameAr: c.nameAr,
        sortOrder: c.sortOrder,
      },
      update: {
        nameEn: c.nameEn,
        nameAr: c.nameAr,
        sortOrder: c.sortOrder,
      },
    });
  }
}

export async function upsertVehiclesIqFromJson(db: PrismaClient): Promise<void> {
  const raw = readFileSync(dataPath("vehicles-iq.json"), "utf8");
  const file = JSON.parse(raw) as VehicleSeedFile;
  const marketCode = file.marketCode;
  const yearCap = new Date().getFullYear();

  for (const mk of file.makes) {
    const make = await db.vehicleMake.upsert({
      where: { name: mk.name },
      create: { name: mk.name, nameAr: mk.nameAr ?? null },
      update: { nameAr: mk.nameAr ?? null },
    });

    await db.vehicleMakeMarket.upsert({
      where: { makeId_marketCode: { makeId: make.id, marketCode } },
      create: { makeId: make.id, marketCode, sortOrder: mk.sortOrder },
      update: { sortOrder: mk.sortOrder },
    });

    for (const mod of mk.models) {
      const model = await db.vehicleModel.upsert({
        where: { makeId_name: { makeId: make.id, name: mod.name } },
        create: {
          makeId: make.id,
          name: mod.name,
          nameAr: mod.nameAr ?? null,
        },
        update: { nameAr: mod.nameAr ?? null },
      });

      await db.vehicleModelMarket.upsert({
        where: { modelId_marketCode: { modelId: model.id, marketCode } },
        create: { modelId: model.id, marketCode, sortOrder: mod.sortOrder },
        update: { sortOrder: mod.sortOrder },
      });

      const yEnd = Math.min(mod.yearTo, yearCap);
      if (mod.yearFrom > yEnd) {
        continue;
      }
      const yearRows = [];
      for (let y = mod.yearFrom; y <= yEnd; y += 1) {
        yearRows.push({ modelId: model.id, year: y });
      }
      await db.vehicleModelYear.createMany({
        data: yearRows,
        skipDuplicates: true,
      });
    }
  }
}
