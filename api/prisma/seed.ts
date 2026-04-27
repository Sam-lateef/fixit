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
  // Basra
  { name: "Ashar", nameAr: "العشار", city: "Basra", cityAr: "البصرة", lat: 30.5089, lng: 47.7858 },
  { name: "Zubayr", nameAr: "الزبير", city: "Basra", cityAr: "البصرة", lat: 30.3822, lng: 47.7069 },
  { name: "Hayyaniya", nameAr: "الحيانية", city: "Basra", cityAr: "البصرة", lat: 30.53, lng: 47.82 },
  { name: "Jubaila", nameAr: "الجبيلة", city: "Basra", cityAr: "البصرة", lat: 30.55, lng: 47.81 },
  { name: "Tannuma", nameAr: "التنومة", city: "Basra", cityAr: "البصرة", lat: 30.52, lng: 47.83 },
  { name: "Maaqal", nameAr: "المعقل", city: "Basra", cityAr: "البصرة", lat: 30.54, lng: 47.81 },
  // Mosul
  { name: "Nabi Younis", nameAr: "نبي يونس", city: "Mosul", cityAr: "الموصل", lat: 36.3292, lng: 43.1372 },
  { name: "Hadbaa", nameAr: "الحدباء", city: "Mosul", cityAr: "الموصل", lat: 36.37, lng: 43.15 },
  { name: "Old City", nameAr: "المدينة القديمة", city: "Mosul", cityAr: "الموصل", lat: 36.34, lng: 43.13 },
  { name: "Zuhour", nameAr: "الزهور", city: "Mosul", cityAr: "الموصل", lat: 36.36, lng: 43.16 },
  // Erbil
  { name: "Ankawa", nameAr: "عينكاوا", city: "Erbil", cityAr: "أربيل", lat: 36.22, lng: 44.0 },
  { name: "Iskan", nameAr: "الإسكان", city: "Erbil", cityAr: "أربيل", lat: 36.19, lng: 44.01 },
  { name: "Citadel", nameAr: "القلعة", city: "Erbil", cityAr: "أربيل", lat: 36.191, lng: 44.009 },
  { name: "Bakhtiari", nameAr: "البختياري", city: "Erbil", cityAr: "أربيل", lat: 36.20, lng: 44.02 },
  // Sulaymaniyah
  { name: "Sulaymaniyah Center", nameAr: "السليمانية", city: "Sulaymaniyah", cityAr: "السليمانية", lat: 35.5568, lng: 45.4361 },
  { name: "Salem Street", nameAr: "شارع سالم", city: "Sulaymaniyah", cityAr: "السليمانية", lat: 35.561, lng: 45.43 },
  { name: "Bakhtiyari", nameAr: "البختياري", city: "Sulaymaniyah", cityAr: "السليمانية", lat: 35.55, lng: 45.44 },
  // Duhok
  { name: "Duhok Center", nameAr: "دهوك", city: "Duhok", cityAr: "دهوك", lat: 36.8671, lng: 42.9881 },
  { name: "Masike", nameAr: "ماسيكي", city: "Duhok", cityAr: "دهوك", lat: 36.86, lng: 42.99 },
  // Kirkuk
  { name: "Kirkuk Center", nameAr: "مركز كركوك", city: "Kirkuk", cityAr: "كركوك", lat: 35.4681, lng: 44.3922 },
  { name: "Shorja", nameAr: "الشورجة", city: "Kirkuk", cityAr: "كركوك", lat: 35.47, lng: 44.39 },
  { name: "Rahimawa", nameAr: "رحيماوة", city: "Kirkuk", cityAr: "كركوك", lat: 35.48, lng: 44.40 },
  // Najaf
  { name: "Najaf Center", nameAr: "مركز النجف", city: "Najaf", cityAr: "النجف", lat: 32.029, lng: 44.3396 },
  { name: "Kufa", nameAr: "الكوفة", city: "Najaf", cityAr: "النجف", lat: 32.033, lng: 44.40 },
  { name: "Manathira", nameAr: "المناذرة", city: "Najaf", cityAr: "النجف", lat: 32.05, lng: 44.42 },
  // Karbala
  { name: "Karbala Center", nameAr: "مركز كربلاء", city: "Karbala", cityAr: "كربلاء", lat: 32.616, lng: 44.0248 },
  { name: "Hindiya", nameAr: "الهندية", city: "Karbala", cityAr: "كربلاء", lat: 32.55, lng: 44.21 },
  { name: "Ain al-Tamr", nameAr: "عين التمر", city: "Karbala", cityAr: "كربلاء", lat: 32.58, lng: 43.48 },
  // Babylon (Babil)
  { name: "Hillah", nameAr: "الحلة", city: "Babylon", cityAr: "بابل", lat: 32.4836, lng: 44.4308 },
  { name: "Mahawil", nameAr: "المحاويل", city: "Babylon", cityAr: "بابل", lat: 32.71, lng: 44.46 },
  { name: "Musayyib", nameAr: "المسيب", city: "Babylon", cityAr: "بابل", lat: 32.78, lng: 44.29 },
  { name: "Hashimiyah", nameAr: "الهاشمية", city: "Babylon", cityAr: "بابل", lat: 32.18, lng: 44.65 },
  // Anbar
  { name: "Ramadi", nameAr: "الرمادي", city: "Anbar", cityAr: "الأنبار", lat: 33.4258, lng: 43.3081 },
  { name: "Fallujah", nameAr: "الفلوجة", city: "Anbar", cityAr: "الأنبار", lat: 33.3556, lng: 43.7868 },
  { name: "Heet", nameAr: "هيت", city: "Anbar", cityAr: "الأنبار", lat: 33.6383, lng: 42.8267 },
  { name: "Haditha", nameAr: "حديثة", city: "Anbar", cityAr: "الأنبار", lat: 34.1394, lng: 42.3811 },
  // Diyala
  { name: "Baquba", nameAr: "بعقوبة", city: "Diyala", cityAr: "ديالى", lat: 33.7472, lng: 44.6439 },
  { name: "Khalis", nameAr: "الخالص", city: "Diyala", cityAr: "ديالى", lat: 33.81, lng: 44.53 },
  { name: "Muqdadiyah", nameAr: "المقدادية", city: "Diyala", cityAr: "ديالى", lat: 33.97, lng: 44.93 },
  { name: "Khanaqin", nameAr: "خانقين", city: "Diyala", cityAr: "ديالى", lat: 34.34, lng: 45.39 },
  // Wasit
  { name: "Kut", nameAr: "الكوت", city: "Wasit", cityAr: "واسط", lat: 32.5132, lng: 45.8189 },
  { name: "Numaniyah", nameAr: "النعمانية", city: "Wasit", cityAr: "واسط", lat: 32.535, lng: 45.376 },
  { name: "Hai", nameAr: "الحي", city: "Wasit", cityAr: "واسط", lat: 32.171, lng: 46.045 },
  { name: "Suwaira", nameAr: "الصويرة", city: "Wasit", cityAr: "واسط", lat: 32.92, lng: 44.78 },
  // Maysan
  { name: "Amarah", nameAr: "العمارة", city: "Maysan", cityAr: "ميسان", lat: 31.8333, lng: 47.1444 },
  { name: "Majar al-Kabir", nameAr: "المجر الكبير", city: "Maysan", cityAr: "ميسان", lat: 31.564, lng: 47.156 },
  { name: "Qalat Salih", nameAr: "قلعة صالح", city: "Maysan", cityAr: "ميسان", lat: 31.51, lng: 47.27 },
  { name: "Ali al-Gharbi", nameAr: "علي الغربي", city: "Maysan", cityAr: "ميسان", lat: 32.45, lng: 46.69 },
  // Dhi Qar
  { name: "Nasiriyah", nameAr: "الناصرية", city: "Dhi Qar", cityAr: "ذي قار", lat: 31.0428, lng: 46.2575 },
  { name: "Suq al-Shuyukh", nameAr: "سوق الشيوخ", city: "Dhi Qar", cityAr: "ذي قار", lat: 30.886, lng: 46.466 },
  { name: "Shatra", nameAr: "الشطرة", city: "Dhi Qar", cityAr: "ذي قار", lat: 31.412, lng: 46.176 },
  { name: "Rifai", nameAr: "الرفاعي", city: "Dhi Qar", cityAr: "ذي قار", lat: 31.71, lng: 46.10 },
  // Muthanna
  { name: "Samawah", nameAr: "السماوة", city: "Muthanna", cityAr: "المثنى", lat: 31.3091, lng: 45.2811 },
  { name: "Rumaytha", nameAr: "الرميثة", city: "Muthanna", cityAr: "المثنى", lat: 31.526, lng: 45.207 },
  { name: "Khidhir", nameAr: "الخضر", city: "Muthanna", cityAr: "المثنى", lat: 31.116, lng: 45.842 },
  // Qadisiyyah
  { name: "Diwaniyah", nameAr: "الديوانية", city: "Qadisiyyah", cityAr: "القادسية", lat: 31.9892, lng: 44.9244 },
  { name: "Afak", nameAr: "عفك", city: "Qadisiyyah", cityAr: "القادسية", lat: 32.07, lng: 45.26 },
  { name: "Hamza", nameAr: "الحمزة", city: "Qadisiyyah", cityAr: "القادسية", lat: 31.71, lng: 44.97 },
  { name: "Shamiya", nameAr: "الشامية", city: "Qadisiyyah", cityAr: "القادسية", lat: 31.96, lng: 44.59 },
  // Saladin
  { name: "Tikrit", nameAr: "تكريت", city: "Saladin", cityAr: "صلاح الدين", lat: 34.5969, lng: 43.6764 },
  { name: "Samarra", nameAr: "سامراء", city: "Saladin", cityAr: "صلاح الدين", lat: 34.198, lng: 43.874 },
  { name: "Bayji", nameAr: "بيجي", city: "Saladin", cityAr: "صلاح الدين", lat: 34.929, lng: 43.491 },
  { name: "Balad", nameAr: "بلد", city: "Saladin", cityAr: "صلاح الدين", lat: 34.018, lng: 44.142 },
  // Halabja
  { name: "Halabja Center", nameAr: "مركز حلبجة", city: "Halabja", cityAr: "حلبجة", lat: 35.1833, lng: 45.9892 },
  { name: "Said Sadiq", nameAr: "سيد صادق", city: "Halabja", cityAr: "حلبجة", lat: 35.36, lng: 45.86 },
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
