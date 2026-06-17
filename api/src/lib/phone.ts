/**
 * E.164 numbers accepted for WhatsApp OTP (Infobip).
 * Iraq production: +9647 + 9 digits. The +90/+10 form is retained in the
 * regex for internal testing/travel only and is intentionally NOT surfaced
 * in `e164WhatsAppOtpHint()` so users never see a Turkey reference.
 */
export const E164_WHATSAPP_OTP =
  /^(\+9647\d{9}|\+90\d{10})$/;

export function e164WhatsAppOtpHint(): string {
  return "Enter a valid Iraqi WhatsApp number (+9647XXXXXXXXX)";
}
