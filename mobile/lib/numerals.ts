/**
 * Convert Arabic-Indic and Persian digits to ASCII.
 *
 * Iraqi keyboards often produce Arabic-Indic numerals (٠–٩) when the user
 * types in Arabic. JavaScript's `Number()` does not parse those — it returns
 * NaN. Rather than block the user behind an English-only constraint, we
 * normalise digits before parsing prices, years, quantities, etc.
 *
 * Supports:
 * - Arabic-Indic   ٠ ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩  (U+0660–U+0669)
 * - Persian        ۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹  (U+06F0–U+06F9)
 */
export function normalizeDigits(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code >= 0x0660 && code <= 0x0669) {
      out += String(code - 0x0660);
    } else if (code >= 0x06f0 && code <= 0x06f9) {
      out += String(code - 0x06f0);
    } else {
      out += input[i];
    }
  }
  return out;
}

/**
 * Parse a (possibly Arabic-numeral) integer string. Returns NaN when the
 * input contains anything other than digits / whitespace / leading minus.
 */
export function parseIntLoose(input: string): number {
  const t = normalizeDigits(input).trim();
  if (t.length === 0) return NaN;
  const n = parseInt(t, 10);
  return n;
}
