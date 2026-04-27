type PublicConfigJson = {
  adminLoginUrl?: string | null;
};

const FLY_DEV_SUFFIX = ".fly.dev";

/**
 * If the marketing site is on `https://<name>-api.fly.dev`, assume the Next admin
 * app is deployed at `https://<name>-admin.fly.dev` (same convention as `fly.toml` `app = "fixit-api"`).
 */
function siblingFlyAdminLoginUrl(hostname: string): string | null {
  if (!hostname.endsWith(FLY_DEV_SUFFIX)) {
    return null;
  }
  const sub = hostname.slice(0, -FLY_DEV_SUFFIX.length);
  if (!sub.endsWith("-api") || sub.length <= 4) {
    return null;
  }
  const prefix = sub.slice(0, -"-api".length);
  if (prefix.length === 0) {
    return null;
  }
  return `https://${prefix}-admin${FLY_DEV_SUFFIX}/login`;
}

function isLocalViteMarketingShell(): boolean {
  if (import.meta.env.DEV) {
    return true;
  }
  if (typeof window === "undefined") {
    return false;
  }
  const p = window.location.port;
  return p === "5173" || p === "5174" || p === "4173";
}

/**
 * Sync default for the admin login link. Next admin lives in `web/admin`
 * (`npm run dev` → port 3001, path `/login`).
 *
 * Priority: `VITE_ADMIN_LOGIN_URL` → same host :3001 on Vite ports → sibling
 * `*-admin.fly.dev` when page is on `*-api.fly.dev` → localhost for dev build.
 */
export function getAdminLoginUrl(): string {
  const raw = (import.meta.env.VITE_ADMIN_LOGIN_URL as string | undefined)?.trim();
  if (raw !== undefined && raw.length > 0) {
    return raw;
  }
  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    const isVitePort =
      port === "5173" || port === "5174" || port === "4173";
    if (isVitePort) {
      const adminProtocol =
        hostname === "localhost" || hostname === "127.0.0.1" ? "http:" : protocol;
      return `${adminProtocol}//${hostname}:3001/login`;
    }
    const flySibling = siblingFlyAdminLoginUrl(hostname);
    if (flySibling !== null) {
      return flySibling;
    }
  }
  if (import.meta.env.DEV) {
    return "http://localhost:3001/login";
  }
  return "http://localhost:3001/login";
}

/**
 * Resolves the admin dashboard login URL.
 *
 * On the **local Vite** shell (`import.meta.env.DEV` or ports 5173/5174/4173),
 * skips `/api/v1/public/config` so a production `ADMIN_LOGIN_URL` in `api/.env`
 * does not override the same-host port-3001 login URL for the repo Next app.
 *
 * Otherwise: API `ADMIN_LOGIN_URL` when set, then {@link getAdminLoginUrl}.
 */
export async function resolveAdminLoginHref(): Promise<string> {
  if (isLocalViteMarketingShell()) {
    return getAdminLoginUrl();
  }
  const fromApi = await fetchAdminLoginUrlFromApi();
  if (fromApi !== null) {
    return fromApi;
  }
  return getAdminLoginUrl();
}

async function fetchAdminLoginUrlFromApi(): Promise<string | null> {
  try {
    const res = await fetch("/api/v1/public/config");
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as PublicConfigJson;
    const u = data.adminLoginUrl;
    if (typeof u !== "string") {
      return null;
    }
    const trimmed = u.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}
