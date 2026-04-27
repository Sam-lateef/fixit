import type { StringKey } from "@/lib/strings";

/**
 * Map an unknown thrown value (usually from `apiFetch`) to a string the
 * user can read. Replaces the server's raw "Invalid body" / similar zod
 * messages with a friendly fallback. Falls back to the localized
 * `genericSaveFailed` when the raw message is empty or unhelpful.
 *
 * Pattern:
 *   } catch (e) {
 *     setErr(friendlyApiError(e, t));
 *   }
 */
export function friendlyApiError(
  e: unknown,
  t: (k: StringKey) => string,
  fallbackKey: StringKey = "genericSaveFailed",
): string {
  const raw = e instanceof Error ? e.message.trim() : "";
  const lower = raw.toLowerCase();
  // Server-side surfaces these on zod / shape failures — never useful for users.
  const unhelpful = new Set([
    "",
    "failed",
    "invalid body",
    "validation failed",
    "request failed",
    "network request failed",
  ]);
  if (unhelpful.has(lower)) {
    return t(fallbackKey);
  }
  return raw;
}
