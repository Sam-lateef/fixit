import { prisma } from "../db/prisma.js";
import { isOtpiqConfigured, sendOtpiqCode } from "./otpiq.js";

const IRAQI_MOBILE = /^\+9647\d{9}$/;

function devMockPhoneE164(): string | null {
  const raw = process.env.DEV_MOCK_PHONE?.trim();
  if (!raw || !IRAQI_MOBILE.test(raw)) return null;
  return raw;
}

function shouldSkipSendForDevMock(phone: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.DEV_ALLOW_MOCK_AUTH !== "true") return false;
  if (!process.env.DEV_OTP_BYPASS_CODE) return false;
  const mock = devMockPhoneE164();
  return mock !== null && phone === mock;
}

/**
 * Provider priority:
 *   1. otpiq.com  — set OTPIQ_API_KEY (production phone OTP)
 *   2. Dev bypass — local only (DEV_OTP_BYPASS_CODE; never in production)
 */
export async function sendOTP(phone: string): Promise<void> {
  if (shouldSkipSendForDevMock(phone)) {
    return;
  }

  if (isOtpiqConfigured()) {
    const code = await sendOtpiqCode(phone);
    // Store the code in pendingOtp (pinId field reused as the code itself)
    await prisma.pendingOtp.upsert({
      where: { phone },
      update: { pinId: code, createdAt: new Date() },
      create: { phone, pinId: code },
    });
    return;
  }

  if (process.env.DEV_OTP_BYPASS_CODE && process.env.NODE_ENV !== "production") {
    console.warn(
      "[auth] No OTP provider configured — skipping send (verify with DEV_OTP_BYPASS_CODE).",
    );
    return;
  }

  throw new Error(
    "No OTP provider configured. Set OTPIQ_API_KEY for production, or DEV_OTP_BYPASS_CODE for local dev.",
  );
}

/**
 * Verifies OTP:
 *   1. Dev bypass code — always checked first (dev only)
 *   2. otpiq stored code — pinId column holds the plaintext code when otpiq sent
 */
export async function verifyOTP(phone: string, code: string): Promise<boolean> {
  const bypass = process.env.DEV_OTP_BYPASS_CODE;
  if (bypass && code === bypass && process.env.NODE_ENV !== "production") {
    await prisma.pendingOtp.deleteMany({ where: { phone } });
    return true;
  }

  const pending = await prisma.pendingOtp.findUnique({ where: { phone } });
  if (!pending) return false;

  // otpiq stores the raw code in pinId
  if (isOtpiqConfigured()) {
    const ok = pending.pinId === code;
    if (ok) await prisma.pendingOtp.delete({ where: { phone } });
    return ok;
  }

  return false;
}
