/**
 * E.164 numbers accepted for WhatsApp OTP (Infobip).
 * Iraq production: +9647 + 9 digits. Turkey: +90 + 10 digits (testing / travel).
 */
export const E164_WHATSAPP_OTP =
  /^(\+9647\d{9}|\+90\d{10})$/;

export function e164WhatsAppOtpHint(): string {
  return "Use +9647XXXXXXXXX (Iraq) or +90XXXXXXXXXX (Turkey)";
}
