import type { FastifyInstance } from "fastify";

const FLY_DEV_SUFFIX = ".fly.dev";

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
 * Public, non-secret values for the web SPA (same origin as the API when the
 * Vite bundle is served from Fastify).
 */
export async function registerPublicConfigRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get("/api/v1/public/config", async () => {
    return {
      adminLoginUrl: resolvePublicAdminLoginUrl(),
    };
  });
}
