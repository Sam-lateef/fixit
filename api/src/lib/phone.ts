/**
 * E.164 numbers accepted for WhatsApp OTP (Infobip). Iraq-only: +9647 + 9 digits.
 */
export const E164_WHATSAPP_OTP = /^\+9647\d{9}$/;

export function e164WhatsAppOtpHint(): string {
  return "Enter a valid Iraqi WhatsApp number (+9647XXXXXXXXX)";
}
