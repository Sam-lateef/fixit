/** Iraq mobile WhatsApp OTP — matches API `E164_WHATSAPP_OTP` in `api/src/lib/phone.ts`. */
export const IRAQ_PHONE_PREFIX = "+964";

/** +964 then 9–10 national digits (mobile, landline, etc.). */
const IRAQ_E164 = /^\+964[1-9]\d{8,9}$/;

/** Iraqi mobile only — legacy WhatsApp OTP screen. */
const WHATSAPP_OTP_E164 = /^\+9647\d{9}$/;

export function isValidIraqPhoneE164(value: string): boolean {
  return IRAQ_E164.test(value.trim());
}

export function isValidWhatsappE164(value: string): boolean {
  return WHATSAPP_OTP_E164.test(value.trim());
}

/** Digits the user types after the fixed `+964` prefix (e.g. `750 123 4567`). */
export function normalizeIraqPhoneSuffix(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("964")) {
    digits = digits.slice(3);
  }
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

/** Build full E.164 from suffix digits entered after `+964`. */
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
