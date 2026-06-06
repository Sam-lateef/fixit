/** Normalize `city` query / body values to the English labels stored on `District.city`.
 *
 * Keys must be lowercase. Values match `cities.json` `nameEn` exactly (Prisma
 * stores `District.city` and `User.city` with these casings). Add a new entry
 * here whenever `cities.json` grows.
 */

const CANONICAL: Record<string, string> = {
  baghdad: "Baghdad",
  basra: "Basra",
  mosul: "Mosul",
  erbil: "Erbil",
  sulaymaniyah: "Sulaymaniyah",
  duhok: "Duhok",
  kirkuk: "Kirkuk",
  najaf: "Najaf",
  karbala: "Karbala",
  babylon: "Babylon",
  anbar: "Anbar",
  diyala: "Diyala",
  wasit: "Wasit",
  maysan: "Maysan",
  "dhi qar": "Dhi Qar",
  "dhi-qar": "Dhi Qar",
  dhiqar: "Dhi Qar",
  muthanna: "Muthanna",
  qadisiyyah: "Qadisiyyah",
  qadisiya: "Qadisiyyah",
  qadissiyah: "Qadisiyyah",
  saladin: "Saladin",
  "salah al-din": "Saladin",
  "salah ad-din": "Saladin",
  halabja: "Halabja",
  other: "Other",
  "sulaymaniyah center": "Sulaymaniyah",
  "duhok center": "Duhok",
  "kirkuk center": "Kirkuk",
  "karbala center": "Karbala",
  "najaf center": "Najaf",
  "halabja center": "Halabja",
};

export function parseCityQueryParam(query: unknown): string | undefined {
  if (!query || typeof query !== "object") {
    return undefined;
  }
  const rec = query as Record<string, unknown>;
  const raw = rec.city;
  let s: string | undefined;
  if (typeof raw === "string") {
    s = raw;
  } else if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "string") {
    s = raw[0];
  }
  if (s === undefined) {
    return undefined;
  }
  const t = s.trim();
  return t.length > 0 ? t : undefined;
}

export function canonicalIraqCityForDistricts(input: string): string {
  const t = input.trim();
  if (!t) {
    return t;
  }
  const key = t.toLowerCase();
  return CANONICAL[key] ?? t;
}
