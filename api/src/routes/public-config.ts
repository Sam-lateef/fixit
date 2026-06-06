import type { FastifyInstance } from "fastify";

const FLY_DEV_SUFFIX = ".fly.dev";
const SHOP_DASHBOARD_HASH = "/#/shop/dashboard";

/**
 * When `ADMIN_LOGIN_URL` is unset on Fly, derive the admin app URL from
 * `FLY_APP_NAME` (e.g. `fixit-api` → `https://fixit-admin.fly.dev/login`), matching
 * the convention used by the web SPA (`app/src/config/admin-login-url.ts`).
 */
function resolvePublicAdminLoginUrl(): string | null {
  const raw = process.env.ADMIN_LOGIN_URL;
  const explicit =
    typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : "";
  if (explicit.length > 0) {
    return explicit;
  }

  const flyApp = process.env.FLY_APP_NAME?.trim();
  if (
    typeof flyApp !== "string" ||
    flyApp.length <= 4 ||
    !flyApp.endsWith("-api")
  ) {
    return null;
  }
  const prefix = flyApp.slice(0, -"-api".length);
  if (prefix.length === 0) {
    return null;
  }
  return `https://${prefix}-admin${FLY_DEV_SUFFIX}/login`;
}

/**
 * Resolve the shop dashboard URL exposed to the mobile app.
 *
 * Phase 1: the actual shop dashboard does not exist yet — the URL points at a
 * "coming soon" placeholder page (`#/shop/dashboard`) on the Vite SPA that is
 * served from the same origin as this API in production. Override with the
 * `SHOP_DASHBOARD_URL` env var to flip the link to a real dashboard later
 * without rebuilding the mobile app.
 *
 * Resolution order: explicit `SHOP_DASHBOARD_URL` → `https://<fly-app>.fly.dev`
 * (when `FLY_APP_NAME` is set, e.g. `fixit-api` → `https://fixit-api.fly.dev/#/shop/dashboard`)
 * → `APP_URL` + hash route → `null`.
 */
function resolvePublicShopDashboardUrl(): string | null {
  const raw = process.env.SHOP_DASHBOARD_URL;
  const explicit =
    typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : "";
  if (explicit.length > 0) {
    return explicit;
  }

  const flyApp = process.env.FLY_APP_NAME?.trim();
  if (typeof flyApp === "string" && flyApp.length > 0) {
    return `https://${flyApp}${FLY_DEV_SUFFIX}${SHOP_DASHBOARD_HASH}`;
  }

  const appUrl = process.env.APP_URL?.trim();
  if (typeof appUrl === "string" && appUrl.length > 0) {
    return `${appUrl.replace(/\/+$/, "")}${SHOP_DASHBOARD_HASH}`;
  }

  return null;
}

/**
 * Public, non-secret values for the web SPA (same origin as the API when the
 * Vite bundle is served from Fastify) and the mobile app.
 */
export async function registerPublicConfigRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get("/api/v1/public/config", async () => {
    return {
      adminLoginUrl: resolvePublicAdminLoginUrl(),
      shopDashboardUrl: resolvePublicShopDashboardUrl(),
    };
  });
}
