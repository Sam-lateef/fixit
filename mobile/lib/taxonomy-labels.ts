import type { LocaleId } from "./strings";

/** Stored on the API as English labels; shown localized in the app. */
export const REPAIR_CATEGORY_SLUGS = [
  "Engine",
  "Brakes",
  "Electrical",
  "AC",
  "Tyres",
  "Suspension",
  "Body & Paint",
  "Transmission",
  "Exhaust",
  "Oil & Fluids",
  "Other",
] as const;

export const PARTS_CATEGORY_SLUGS = [
  "Engine parts",
  "Brakes",
  "Filters",
  "Electrical",
  "Suspension",
  "Body parts",
  "Tyres",
  "AC parts",
  "Exhaust",
  "Other",
] as const;

export const IRAQ_OWNER_CITIES = [
  "Baghdad",
  "Basra",
  "Mosul",
  "Erbil",
  "Sulaymaniyah",
  "Duhok",
  "Kirkuk",
  "Najaf",
  "Karbala",
  "Babylon",
  "Anbar",
  "Diyala",
  "Wasit",
  "Maysan",
  "Dhi Qar",
  "Muthanna",
  "Qadisiyyah",
  "Saladin",
  "Halabja",
  "Other",
] as const;

type RepairSlug = (typeof REPAIR_CATEGORY_SLUGS)[number];
type PartsSlug = (typeof PARTS_CATEGORY_SLUGS)[number];
type CitySlug = (typeof IRAQ_OWNER_CITIES)[number];

const REPAIR_I18N: Record<RepairSlug, { en: string; ar: string }> = {
  Engine: { en: "Engine", ar: "المحرك" },
  Brakes: { en: "Brakes", ar: "الفرامل" },
  Electrical: { en: "Electrical", ar: "الكهرباء" },
  AC: { en: "AC", ar: "التكييف" },
  Tyres: { en: "Tyres", ar: "الإطارات" },
  Suspension: { en: "Suspension", ar: "التعليق" },
  "Body & Paint": { en: "Body & Paint", ar: "الهيكل والدهان" },
  Transmission: { en: "Transmission", ar: "ناقل الحركة" },
  Exhaust: { en: "Exhaust", ar: "العادم" },
  "Oil & Fluids": { en: "Oil & Fluids", ar: "الزيوت والسوائل" },
  Other: { en: "Other", ar: "أخرى" },
};

const PARTS_I18N: Record<PartsSlug, { en: string; ar: string }> = {
  "Engine parts": { en: "Engine parts", ar: "قطع المحرك" },
  Brakes: { en: "Brakes", ar: "الفرامل" },
  Filters: { en: "Filters", ar: "الفلاتر" },
  Electrical: { en: "Electrical", ar: "الكهرباء" },
  Suspension: { en: "Suspension", ar: "التعليق" },
  "Body parts": { en: "Body parts", ar: "قطع الهيكل" },
  Tyres: { en: "Tyres", ar: "الإطارات" },
  "AC parts": { en: "AC parts", ar: "قطع التكييف" },
  Exhaust: { en: "Exhaust", ar: "العادم" },
  Other: { en: "Other", ar: "أخرى" },
};

const CITY_I18N: Record<CitySlug, { en: string; ar: string }> = {
  Baghdad: { en: "Baghdad", ar: "بغداد" },
  Basra: { en: "Basra", ar: "البصرة" },
  Mosul: { en: "Mosul", ar: "الموصل" },
  Erbil: { en: "Erbil", ar: "أربيل" },
  Sulaymaniyah: { en: "Sulaymaniyah", ar: "السليمانية" },
  Duhok: { en: "Duhok", ar: "دهوك" },
  Kirkuk: { en: "Kirkuk", ar: "كركوك" },
  Najaf: { en: "Najaf", ar: "النجف" },
  Karbala: { en: "Karbala", ar: "كربلاء" },
  Babylon: { en: "Babylon", ar: "بابل" },
  Anbar: { en: "Anbar", ar: "الأنبار" },
  Diyala: { en: "Diyala", ar: "ديالى" },
  Wasit: { en: "Wasit", ar: "واسط" },
  Maysan: { en: "Maysan", ar: "ميسان" },
  "Dhi Qar": { en: "Dhi Qar", ar: "ذي قار" },
  Muthanna: { en: "Muthanna", ar: "المثنى" },
  Qadisiyyah: { en: "Qadisiyyah", ar: "القادسية" },
  Saladin: { en: "Saladin", ar: "صلاح الدين" },
  Halabja: { en: "Halabja", ar: "حلبجة" },
  Other: { en: "Other", ar: "أخرى" },
};

export function repairCategoryLabel(slug: string, locale: LocaleId): string {
  const row = REPAIR_I18N[slug as RepairSlug];
  if (!row) {
    return slug;
  }
  return locale === "en" ? row.en : row.ar;
}

export function partsCategoryLabel(slug: string, locale: LocaleId): string {
  const row = PARTS_I18N[slug as PartsSlug];
  if (!row) {
    return slug;
  }
  return locale === "en" ? row.en : row.ar;
}

export function ownerCityLabel(city: string, locale: LocaleId): string {
  const row = CITY_I18N[city as CitySlug];
  if (!row) {
    return city;
  }
  return locale === "en" ? row.en : row.ar;
}
