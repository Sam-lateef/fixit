import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  upsertCitiesFromJson,
  upsertVehiclesIqFromJson,
} from "../src/lib/catalog-json-seed.js";

const prisma = new PrismaClient();

const BAGHDAD_CENTER = { lat: 33.3152, lng: 44.3661 };
const BAGHDAD_CENTROIDS_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "baghdad-centroids.json",
);

type BaghdadCentroids = Record<string, { lat: number; lng: number }>;

function loadBaghdadCentroids(): BaghdadCentroids {
  try {
    const raw = readFileSync(BAGHDAD_CENTROIDS_PATH, "utf8");
    return JSON.parse(raw) as BaghdadCentroids;
  } catch {
    return {};
  }
}

const BAGHDAD_DISTRICTS: Array<{ name: string; nameAr: string }> = [
  { name: "Sinak", nameAr: "السنك" },
  { name: "Al-Khilani", nameAr: "الخيلاني" },
  { name: "Abu Nawas", nameAr: "أبو نواس" },
  { name: "Haydar-Khana", nameAr: "الحيدر خانة" },
  { name: "Orfali", nameAr: "الأورفلي" },
  { name: "Bataween", nameAr: "البتاوين" },
  { name: "Al-Saadoon", nameAr: "السعدون" },
  { name: "Camp Gailani", nameAr: "معسكر الكيلاني" },
  { name: "Sheikh Omar", nameAr: "الشيخ عمر" },
  { name: "Medical City", nameAr: "مدينة الطب" },
  { name: "Bab Al-Muadham", nameAr: "باب المعظم" },
  { name: "Mustansiriya", nameAr: "المستنصرية" },
  { name: "Nile", nameAr: "النيل" },
  { name: "14th July", nameAr: "14 تموز" },
  { name: "Idrissi", nameAr: "الإدريسي" },
  { name: "Adhamiya", nameAr: "الأعظمية" },
  { name: "Waziriyah", nameAr: "الوزيرية" },
  { name: "Waziriyah Industrial", nameAr: "الوزيرية الصناعية" },
  { name: "Qahira", nameAr: "القاهرة" },
  { name: "Ghrai'at", nameAr: "الغرايات" },
  { name: "Tunis", nameAr: "تونس" },
  { name: "Hayy Ur", nameAr: "حي أور" },
  { name: "Shaab East", nameAr: "الشعب شرق" },
  { name: "Shaab North", nameAr: "الشعب شمال" },
  { name: "Shaab South", nameAr: "الشعب جنوب" },
  { name: "Rashdiya", nameAr: "الرشدية" },
  { name: "Sadr City", nameAr: "مدينة الصدر" },
  { name: "Habibiya", nameAr: "الحبيبية" },
  { name: "Ishbiliya", nameAr: "إشبيلية" },
  { name: "Al-Shaab Stadium", nameAr: "ملعب الشعب" },
  { name: "Muthanna", nameAr: "المثنى" },
  { name: "Zayouna", nameAr: "الزيونة" },
  { name: "Ghadeer", nameAr: "الغدير" },
  { name: "Baghdad Al-Jadida", nameAr: "بغداد الجديدة" },
  { name: "Baladiyat", nameAr: "البلديات" },
  { name: "Mashtal", nameAr: "المشتل" },
  { name: "Amin", nameAr: "الأمين" },
  { name: "Nafit", nameAr: "نافت" },
  { name: "Rustumiya", nameAr: "الرستمية" },
  { name: "Fudailiya", nameAr: "الفضيلية" },
  { name: "Kamaliya", nameAr: "الكمالية" },
  { name: "Husseiniya", nameAr: "الحسينية" },
  { name: "Al-Ubedy", nameAr: "العبيدي" },
  { name: "Sinaa", nameAr: "الصناعة" },
  { name: "Alwiyah", nameAr: "العلوية" },
  { name: "Wahda", nameAr: "الوحدة" },
  { name: "Karrada Inside", nameAr: "الكرادة داخل" },
  { name: "Zuwiya", nameAr: "الزوية" },
  { name: "Jadriya", nameAr: "الجادرية" },
  { name: "Karrada Outside", nameAr: "الكرادة خارج" },
  { name: "Arasat", nameAr: "العرصات" },
  { name: "Mesbah", nameAr: "المسبح" },
  { name: "Camp Sarah", nameAr: "معسكر سارة" },
  { name: "Rasheed Camp", nameAr: "معسكر الرشيد" },
  { name: "Zaafaraniya Industrial", nameAr: "الزعفرانية الصناعية" },
  { name: "Saydiya", nameAr: "السيدية" },
  { name: "Rabeea", nameAr: "ربيعة" },
  { name: "Zaafaraniya", nameAr: "الزعفرانية" },
  { name: "Shawaka", nameAr: "الشواكة" },
  { name: "Haifa", nameAr: "حيفا" },
  { name: "Sheikh Marouf", nameAr: "الشيخ معروف" },
  { name: "Shaljia", nameAr: "الشالجية" },
  { name: "Salhiyah", nameAr: "الصالحية" },
  { name: "Karradat Maryam", nameAr: "كرادة مريم" },
  { name: "Umm Al-Khanazeer", nameAr: "أم الخنازير" },
  { name: "Al-Kindi", nameAr: "الكندي" },
  { name: "Harithiya", nameAr: "الحارثية" },
  { name: "Zawra", nameAr: "الزوراء" },
  { name: "Old Muthanna Airport", nameAr: "مطار المثنى القديم" },
  { name: "Utayfiya", nameAr: "العطيفية" },
  { name: "Kadhimiya", nameAr: "الكاظمية" },
  { name: "Ali Al-Saleh", nameAr: "علي الصالح" },
  { name: "Hurriya", nameAr: "الحرية" },
  { name: "Dabbash", nameAr: "الدباش" },
  { name: "Shu'ala", nameAr: "الشعلة" },
  { name: "Qadisiyah", nameAr: "القادسية" },
  { name: "Mansour", nameAr: "المنصور" },
  { name: "Washash", nameAr: "الوشاش" },
  { name: "Iskan", nameAr: "الإسكان" },
  { name: "14 Ramadan", nameAr: "14 رمضان" },
  { name: "Yarmouk", nameAr: "اليرموك" },
  { name: "Safarat", nameAr: "السفارات" },
  { name: "Kafa'at", nameAr: "الكفاءات" },
  { name: "Amiriya", nameAr: "العامرية" },
  { name: "Khadhraa", nameAr: "الخضراء" },
  { name: "Jami'a", nameAr: "الجامعة" },
  { name: "Adel", nameAr: "العادل" },
  { name: "Ghazaliya East", nameAr: "الغزالية شرق" },
  { name: "Ghazaliya West", nameAr: "الغزالية غرب" },
  { name: "Dora Refinery", nameAr: "مصفى الدورة" },
  { name: "Dora", nameAr: "الدورة" },
  { name: "Athureen", nameAr: "الأثوريين" },
  { name: "Tuama", nameAr: "طعمة" },
  { name: "Dhubat", nameAr: "الضباط" },
  { name: "Bajas", nameAr: "بجّاس" },
  { name: "Amel", nameAr: "العامل" },
  { name: "Jihad", nameAr: "الجهاد" },
  { name: "Atibaa", nameAr: "الأطباء" },
  { name: "Ajnadin", nameAr: "أجنادين" },
  { name: "Shurta 4/5", nameAr: "الشرطة الرابعة والخامسة" },
  { name: "Furat", nameAr: "الفرات" },
  { name: "Suwaib", nameAr: "الصويب" },
  { name: "Makasib", nameAr: "المكاسب" },
  { name: "Resala", nameAr: "الرسالة" },
  { name: "Qartan", nameAr: "القرطان" },
  { name: "Ewainey West", nameAr: "العويني غرب" },
  { name: "Ewaireej", nameAr: "العويريج" },
  { name: "Hor Rajab", nameAr: "هور رجب" },
  { name: "Mekanek", nameAr: "الميكانيك" },
  { name: "Asia", nameAr: "آسيا" },
  { name: "Bu'aitha", nameAr: "البوعيثة" },
];

const districts: Array<{
  name: string;
  nameAr: string;
  city: string;
  cityAr: string;
  lat: number;
  lng: number;
}> = [
  ...(() => {
    const centroids = loadBaghdadCentroids();
    return BAGHDAD_DISTRICTS.map((d) => ({
      name: d.name,
      nameAr: d.nameAr,
      city: "Baghdad",
      cityAr: "بغداد",
      lat: centroids[d.name]?.lat ?? BAGHDAD_CENTER.lat,
      lng: centroids[d.name]?.lng ?? BAGHDAD_CENTER.lng,
    }));
  })(),
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
  /** Lets owner-details "Other" city load at least one district without client-side fallback only. */
  {
    name: "Not listed",
    nameAr: "منطقة غير مدرجة",
    city: "Other",
    cityAr: "أخرى",
    lat: 33.31,
    lng: 44.36,
  },
];

async function main(): Promise<void> {
  for (const d of districts) {
    await prisma.district.upsert({
      where: {
        city_name: { city: d.city, name: d.name },
      },
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

  await upsertCitiesFromJson(prisma);
  await upsertVehiclesIqFromJson(prisma);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
