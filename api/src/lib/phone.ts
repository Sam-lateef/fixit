/**
 * Iraq E.164: +964 followed by 9–10 national digits (first digit 1–9, not 0).
 * Covers mobile (7XX…) and other valid Iraqi national numbers.
 */
export const E164_IRAQ = /^\+964[1-9]\d{8,9}$/;

export function e164IraqHint(): string {
  return "Enter a valid Iraqi phone number (+964 XXXXXXXXXX)";
}

/**
 * Iraqi mobile subset for WhatsApp OTP (Infobip): +9647 + 9 digits.
 * Legacy OTP routes only — sign-in is Google/Apple in production.
 */
export const E164_WHATSAPP_OTP = /^\+9647\d{9}$/;

export function e164WhatsAppOtpHint(): string {
  return "Enter a valid Iraqi WhatsApp number (+964 7XX XXX XXXX)";
}
