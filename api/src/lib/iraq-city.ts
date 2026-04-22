/** Normalize `city` query / body values to the English labels stored on `District.city`. */

const CANONICAL: Record<string, string> = {
  baghdad: "Baghdad",
  basra: "Basra",
  mosul: "Mosul",
  erbil: "Erbil",
  najaf: "Najaf",
  karbala: "Karbala",
  kirkuk: "Kirkuk",
  other: "Other",
  sulaymaniyah: "Sulaymaniyah",
  duhok: "Duhok",
  "sulaymaniyah center": "Sulaymaniyah",
  "duhok center": "Duhok",
  "kirkuk center": "Kirkuk",
  "karbala center": "Karbala",
  "najaf center": "Najaf",
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
