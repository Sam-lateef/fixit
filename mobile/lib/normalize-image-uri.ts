/**
 * Trims and normalizes common URL issues (e.g. accidental double slashes in path).
 */
export function normalizeImageUri(raw: string): string {
  const u = raw.trim();
  if (!u) return u;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return u;
    }
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/");
    return parsed.toString();
  } catch {
    return u;
  }
}
