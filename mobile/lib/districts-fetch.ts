import { apiFetch } from "./api";

export type DistrictRow = {
  id: string;
  name: string;
  nameAr: string;
  city: string;
};

function firstRouteParam(v: string | string[] | undefined): string | undefined {
  if (v == null) {
    return undefined;
  }
  if (Array.isArray(v)) {
    return v[0];
  }
  return v;
}

/** Expo Router sometimes passes `string | string[]`. */
export function routeCityParam(
  cityParam: string | string[] | undefined,
  fallback: string,
): string {
  const raw = firstRouteParam(cityParam);
  const t = raw?.trim();
  return t && t.length > 0 ? t : fallback;
}

/**
 * Loads districts for a city. Uses public GET (skipAuth) so signup still works if JWT is flaky.
 * If the filtered API response is empty, retries by filtering the full list (case-insensitive).
 */
export async function fetchDistrictsForCity(city: string): Promise<DistrictRow[]> {
  const c = city.trim();
  const enc = encodeURIComponent(c);
  const opts = { skipAuth: true } as const;
  let list = (
    await apiFetch<{ districts: DistrictRow[] }>(
      `/api/v1/districts?city=${enc}`,
      opts,
    )
  ).districts;
  if (list.length > 0) {
    return list;
  }
  const all = (await apiFetch<{ districts: DistrictRow[] }>("/api/v1/districts", opts))
    .districts;
  const lower = c.toLowerCase();
  return all.filter((d) => d.city.toLowerCase() === lower);
}
