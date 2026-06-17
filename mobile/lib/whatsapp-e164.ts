/** Iraq mobile WhatsApp OTP — matches API `E164_WHATSAPP_OTP` in `api/src/lib/phone.ts`. */
export const IRAQ_PHONE_PREFIX = "+964";

const WHATSAPP_E164 = /^\+9647\d{9}$/;

export function isValidWhatsappE164(value: string): boolean {
  return WHATSAPP_E164.test(value.trim());
}

/** Digits the user types after the fixed `+964` prefix (e.g. `7xx xxx xxxx`). */
export function normalizeIraqPhoneSuffix(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10);
}

/** Build full E.164 from suffix digits (must start with 7 for Iraqi mobile). */
export function buildIraqWhatsappE164(suffix: string): string {
  return `${IRAQ_PHONE_PREFIX}${normalizeIraqPhoneSuffix(suffix)}`;
}

/** Extract suffix for display from a stored E.164 value, or empty if foreign shape. */
export function iraqPhoneSuffixFromE164(e164: string | null | undefined): string {
  const trimmed = (e164 ?? "").trim();
  if (!trimmed.startsWith(IRAQ_PHONE_PREFIX)) {
    return "";
  }
  return trimmed.slice(IRAQ_PHONE_PREFIX.length).replace(/\D/g, "");
}
