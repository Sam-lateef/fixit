import { getApiBaseUrl } from "./api-base";
import { normalizeImageUri } from "./normalize-image-uri";

/**
 * Rewrites `https://pub-*.r2.dev/posts/...` to the FixIt API media proxy (same host as JSON API).
 * Uses `getApiBaseUrl()` so LAN dev (`http://192.168.x.x:3000`) matches uploads and auth.
 */
export function rewriteR2DevImageUrlToApiProxy(uri: string): string {
  const API_BASE = getApiBaseUrl().replace(/\/$/, "");
  const normalized = normalizeImageUri(uri);
  if (!API_BASE) return normalized;
  if (normalized.startsWith(`${API_BASE}/api/v1/media/`)) {
    return normalized;
  }
  try {
    const u = new URL(normalized);
    if (!u.hostname.endsWith(".r2.dev")) return normalized;
    const key = u.pathname.replace(/^\//, "");
    if (!key.startsWith("posts/")) return normalized;
    return `${API_BASE}/api/v1/media/${encodeURIComponent(key)}`;
  } catch {
    return normalized;
  }
}

export function imageUriNeedsJwtAuth(uri: string): boolean {
  const API_BASE = getApiBaseUrl().replace(/\/$/, "");
  if (API_BASE.length === 0) return false;
  return uri.startsWith(`${API_BASE}/api/v1/media/`);
}
