/** Matches API `E164_WHATSAPP_OTP` in `api/src/lib/phone.ts`. */
const WHATSAPP_E164 = /^(\+9647\d{9}|\+90\d{10})$/;

export function isValidWhatsappE164(value: string): boolean {
  return WHATSAPP_E164.test(value.trim());
}
