# Infobip (removed)

FixIt **no longer uses Infobip** for phone OTP. The implementation and setup scripts were removed from the API.

**Current behavior:** `api/src/services/otp.ts` uses **otpiq** (`OTPIQ_API_KEY`) for production SMS OTP, and optional **dev bypass** (`DEV_OTP_BYPASS_CODE` in non-production). See `api/src/services/otpiq.ts` and `api/.env.example`.

This file is kept only so old links do not 404. Do not add new Infobip configuration.
