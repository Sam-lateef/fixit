import { apiFetch, ApiTimeoutError } from "@/lib/api";

/**
 * Resolves the URL of the shop owner's web dashboard.
 *
 * Phase 1: the real dashboard is not built yet — the URL points at a
 * "coming soon" placeholder page (`#/shop/dashboard`) on the same Vite SPA
 * that the API serves. When the real dashboard ships, the `SHOP_DASHBOARD_URL`
 * Fly secret can be flipped without rebuilding the mobile app.
 *
 * Resolution order on each cold start:
 *   1. `EXPO_PUBLIC_SHOP_DASHBOARD_URL` build-time env var, if set.
 *   2. `GET /api/v1/public/config.shopDashboardUrl`, cached for the app lifetime.
 *
 * Returns `null` when the API is unreachable AND no build-time override is set.
 * Callers MUST surface a visible error rather than silently doing nothing.
 */

const SHOP_DASHBOARD_HASH = "/#/shop/dashboard";

function normalizeShopDashboardUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.includes(".fly.dev")) {
    return trimmed;
  }
  const apiBase = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (typeof apiBase === "string" && apiBase.length > 0) {
    return `${apiBase.replace(/\/+$/, "")}${SHOP_DASHBOARD_HASH}`;
  }
  return "https://fixthecar.app/#/shop/dashboard";
}

type PublicConfigResponse = {
  adminLoginUrl: string | null;
  shopDashboardUrl: string | null;
};

let cached: string | null | undefined = undefined;
let inFlight: Promise<string | null> | null = null;

function readEnvOverride(): string | null {
  const raw = process.env.EXPO_PUBLIC_SHOP_DASHBOARD_URL;
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function fetchFromApi(): Promise<string | null> {
  try {
    const data = await apiFetch<PublicConfigResponse>(
      "/api/v1/public/config",
      { skipAuth: true, timeoutMs: 8_000 },
    );
    const url = data.shopDashboardUrl;
    if (typeof url !== "string") {
      return null;
    }
    const trimmed = url.trim();
    return trimmed.length > 0 ? normalizeShopDashboardUrl(trimmed) : null;
  } catch (e) {
    if (e instanceof ApiTimeoutError) {
      console.warn("[shop-dashboard-url] public-config timed out");
    } else {
      console.warn("[shop-dashboard-url] public-config fetch failed", e);
    }
    return null;
  }
}

/**
 * Returns the shop dashboard URL, fetching once per app session and caching.
 *
 * Never throws. Returns `null` if neither the env override nor the API supply
 * a URL — the caller should surface a localized "couldn't open dashboard"
 * message in that case.
 */
export async function getShopDashboardUrl(): Promise<string | null> {
  if (cached !== undefined) {
    return cached;
  }
  const envOverride = readEnvOverride();
  if (envOverride !== null) {
    cached = normalizeShopDashboardUrl(envOverride);
    return cached;
  }
  if (inFlight === null) {
    inFlight = fetchFromApi().then((url) => {
      cached = url;
      inFlight = null;
      return url;
    });
  }
  return inFlight;
}
