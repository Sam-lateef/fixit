/**
 * otpiq.com OTP service (Iraq).
 * API docs: https://otpiq.com/dashboard → API Keys & Docs
 *
 * Required env vars:
 *   OTPIQ_API_KEY   — from your otpiq dashboard
 *   OTPIQ_SENDER_ID — optional, sender name shown on SMS (if your account supports it)
 */

const BASE_URL = "https://api.otpiq.com/api";

export function isOtpiqConfigured(): boolean {
  return Boolean(process.env.OTPIQ_API_KEY);
}

/**
 * Sends a 6-digit OTP via otpiq.com SMS.
 * Returns the generated code so otp.ts can store it for verification.
 */
export async function sendOtpiqCode(phone: string): Promise<string> {
  const apiKey = process.env.OTPIQ_API_KEY;
  if (!apiKey) throw new Error("OTPIQ_API_KEY is not set");

  // Generate a 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));

  const res = await fetch(`${BASE_URL}/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      phone,        // E.164 format e.g. +9647XXXXXXXXX
      sms: `Your Fix It code is: ${code}`,
    }),
  });

  if (!res.ok) {
    let detail: string;
    try {
      const body = (await res.json()) as unknown;
      detail = JSON.stringify(body);
    } catch {
      detail = await res.text();
    }
    throw new Error(`otpiq send failed (${res.status}): ${detail}`);
  }

  return code;
}
