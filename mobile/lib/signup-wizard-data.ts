/**
 * Safely parse the `data` route param the signup wizard threads between
 * steps. The param is a stringified JSON object; we never want a malformed
 * value to crash the whole step screen, so callers always get a plain
 * object back (possibly empty).
 */
export function parseSignupWizardData(
  raw: string | string[] | undefined,
): Record<string, unknown> {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || value.length === 0) {
    return {};
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Malformed payload — fall through to empty object so the wizard step
    // still renders. The user can restart the flow from /signup/shop-type.
  }
  return {};
}
