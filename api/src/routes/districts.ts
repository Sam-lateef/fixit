import type { FastifyInstance } from "fastify";
import { prisma } from "../db/prisma.js";
import {
  canonicalIraqCityForDistricts,
  parseCityQueryParam,
} from "../lib/iraq-city.js";

const DEFAULT_DISTRICTS: Array<{
  name: string;
  nameAr: string;
  city: string;
  cityAr: string;
  lat: number;
  lng: number;
}> = [
  { name: "Karrada", nameAr: "الكرادة", city: "Baghdad", cityAr: "بغداد", lat: 33.3152, lng: 44.4219 },
  { name: "Mansour", nameAr: "المنصور", city: "Baghdad", cityAr: "بغداد", lat: 33.3406, lng: 44.3611 },
  { name: "Jadriya", nameAr: "الجادرية", city: "Baghdad", cityAr: "بغداد", lat: 33.2887, lng: 44.3828 },
  { name: "Adhamiya", nameAr: "الأعظمية", city: "Baghdad", cityAr: "بغداد", lat: 33.3797, lng: 44.4094 },
  { name: "Zayouna", nameAr: "الزيونة", city: "Baghdad", cityAr: "بغداد", lat: 33.3289, lng: 44.4725 },
  { name: "Kadhimiya", nameAr: "الكاظمية", city: "Baghdad", cityAr: "بغداد", lat: 33.3803, lng: 44.3417 },
  { name: "Arasat", nameAr: "العرصات", city: "Baghdad", cityAr: "بغداد", lat: 33.3044, lng: 44.4016 },
  { name: "Sadr City", nameAr: "مدينة الصدر", city: "Baghdad", cityAr: "بغداد", lat: 33.3731, lng: 44.4792 },
  { name: "Dora", nameAr: "الدورة", city: "Baghdad", cityAr: "بغداد", lat: 33.2564, lng: 44.3839 },
  { name: "Hurriya", nameAr: "الحرية", city: "Baghdad", cityAr: "بغداد", lat: 33.3919, lng: 44.3689 },
  { name: "Bayaa", nameAr: "البياع", city: "Baghdad", cityAr: "بغداد", lat: 33.2872, lng: 44.3256 },
  { name: "Yarmouk", nameAr: "اليرموك", city: "Baghdad", cityAr: "بغداد", lat: 33.3233, lng: 44.3333 },
  { name: "Ashar", nameAr: "العشار", city: "Basra", cityAr: "البصرة", lat: 30.5089, lng: 47.7858 },
  { name: "Zubayr", nameAr: "الزبير", city: "Basra", cityAr: "البصرة", lat: 30.3822, lng: 47.7069 },
  { name: "Hayyaniya", nameAr: "الحيانية", city: "Basra", cityAr: "البصرة", lat: 30.53, lng: 47.82 },
  { name: "Nabi Younis", nameAr: "نبي يونس", city: "Mosul", cityAr: "الموصل", lat: 36.3292, lng: 43.1372 },
  { name: "Hadbaa", nameAr: "الحدباء", city: "Mosul", cityAr: "الموصل", lat: 36.37, lng: 43.15 },
  { name: "Ankawa", nameAr: "عينكاوا", city: "Erbil", cityAr: "أربيل", lat: 36.22, lng: 44.0 },
  { name: "Iskan", nameAr: "الإسكان", city: "Erbil", cityAr: "أربيل", lat: 36.19, lng: 44.01 },
  { name: "Najaf Center", nameAr: "مركز النجف", city: "Najaf", cityAr: "النجف", lat: 32.029, lng: 44.3396 },
  { name: "Karbala Center", nameAr: "مركز كربلاء", city: "Karbala", cityAr: "كربلاء", lat: 32.616, lng: 44.0248 },
  { name: "Kirkuk Center", nameAr: "مركز كركوك", city: "Kirkuk", cityAr: "كركوك", lat: 35.4681, lng: 44.3922 },
  { name: "Sulaymaniyah Center", nameAr: "السليمانية", city: "Sulaymaniyah", cityAr: "السليمانية", lat: 35.5568, lng: 45.4361 },
  { name: "Duhok Center", nameAr: "دهوك", city: "Duhok", cityAr: "دهوك", lat: 36.8671, lng: 42.9881 },
  {
    name: "Not listed",
    nameAr: "منطقة غير مدرجة",
    city: "Other",
    cityAr: "أخرى",
    lat: 33.31,
    lng: 44.36,
  },
];

async function ensureDistrictsSeeded(): Promise<void> {
  const existingCount = await prisma.district.count();
  if (existingCount > 0) {
    return;
  }
  for (const district of DEFAULT_DISTRICTS) {
    await prisma.district.upsert({
      where: { city_name: { city: district.city, name: district.name } },
      create: district,
      update: {
        nameAr: district.nameAr,
        cityAr: district.cityAr,
        lat: district.lat,
        lng: district.lng,
      },
    });
  }
}

/** When DB has rows but a city has none (e.g. prod never seeded Baghdad), upsert defaults for that city. */
async function ensureDistrictsForCityIfEmpty(city: string): Promise<void> {
  const forCity = DEFAULT_DISTRICTS.filter((d) => d.city === city);
  if (forCity.length === 0) {
    return;
  }
  const n = await prisma.district.count({ where: { city } });
  if (n > 0) {
    return;
  }
  for (const district of forCity) {
    await prisma.district.upsert({
      where: { city_name: { city: district.city, name: district.name } },
      create: district,
      update: {
        nameAr: district.nameAr,
        cityAr: district.cityAr,
        lat: district.lat,
        lng: district.lng,
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
