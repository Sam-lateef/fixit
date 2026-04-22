import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type District = {
  name: string;
  nameAr: string;
};

type NominatimItem = {
  lat: string;
  lon: string;
};

const BAGHDAD_DISTRICTS: District[] = [
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function fetchCentroid(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: {
      "Accept-Language": "ar,en",
      "User-Agent": "FixIt/1.0 (district centroid generation)",
    },
  });
  if (res.status === 429) {
    throw new Error(`rate_limited:${query}`);
  }
  if (!res.ok) {
    throw new Error(`Nominatim request failed (${res.status}) for "${query}"`);
  }
  const data = (await res.json()) as NominatimItem[];
  if (!data[0]) {
    return null;
  }
  return {
    lat: Number(data[0].lat),
    lng: Number(data[0].lon),
  };
}

async function main(): Promise<void> {
  const out: Record<string, { lat: number; lng: number }> = {};
  const misses: string[] = [];

  for (let i = 0; i < BAGHDAD_DISTRICTS.length; i += 1) {
    const d = BAGHDAD_DISTRICTS[i];
    try {
      const primaryQuery = `${d.name}, Baghdad, Iraq`;
      const arabicQuery = `${d.nameAr}, بغداد, العراق`;
      let point: { lat: number; lng: number } | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const primary = await fetchCentroid(primaryQuery);
          point = primary ?? (await fetchCentroid(arabicQuery));
          break;
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown";
          if (message.startsWith("rate_limited:")) {
            await sleep(6000 + attempt * 3000);
            continue;
          }
          throw error;
        }
      }
      if (!point) {
        misses.push(d.name);
        console.log(`[${i + 1}/${BAGHDAD_DISTRICTS.length}] miss: ${d.name}`);
      } else {
        out[d.name] = point;
        console.log(`[${i + 1}/${BAGHDAD_DISTRICTS.length}] ok: ${d.name}`);
      }
    } catch (error) {
      misses.push(d.name);
      console.log(
        `[${i + 1}/${BAGHDAD_DISTRICTS.length}] error: ${d.name} (${error instanceof Error ? error.message : "unknown"})`,
      );
    }
    await sleep(3000);
  }

  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const filePath = resolve(rootDir, "prisma", "baghdad-centroids.json");
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(out, null, 2)}\n`, "utf8");

  console.log(`Centroids written: ${Object.keys(out).length}/${BAGHDAD_DISTRICTS.length}`);
  if (misses.length > 0) {
    console.log("Missing districts:");
    for (const name of misses) {
      console.log(`- ${name}`);
    }
  }
}

void main();
