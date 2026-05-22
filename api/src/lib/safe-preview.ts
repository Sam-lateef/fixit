/**
 * Truncate text safely for a push-notification preview without splitting a
 * grapheme. JS `String.prototype.slice` operates on UTF-16 code units, so a
 * naive `slice(0, 80)` can cut between a base letter and its combining mark
 * (Arabic harakat, ZWJ/ZWNJ joiners, etc.), causing the trailing mark to drop
 * or render as a floating glyph on some Android notification renderers.
 *
 * This trims any trailing combining marks (Unicode category Mn), zero-width
 * joiners (U+200C ZWNJ / U+200D ZWJ), and a lone trailing high surrogate.
 */

// Built via `new RegExp` so U+200C / U+200D stay visible as escape sequences
// (a regex literal would store them as the actual invisible characters).
const TRAILING_INVISIBLE = new RegExp("[\\p{Mn}\\u200C\\u200D]+$", "u");
const TRAILING_HIGH_SURROGATE = /[\uD800-\uDBFF]$/;

export function safePreview(text: string, maxCodeUnits: number): string {
  let s = text.slice(0, maxCodeUnits);
  s = s.replace(TRAILING_INVISIBLE, "");
  if (TRAILING_HIGH_SURROGATE.test(s)) {
    s = s.slice(0, -1);
  }
  return s.trimEnd();
}
