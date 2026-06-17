import { ApiTimeoutError } from "@/lib/api";
import type { StringKey } from "@/lib/strings";

/** Exact API `error` strings (lowercased) → i18n key. */
const EXACT_API_ERROR_KEYS: Readonly<Record<string, StringKey>> = {
  "phone number already in use": "phoneInUse",
  "this phone number is already linked to another account.": "phoneInUse",
  "phone number is required for shops": "phoneRequired",
  "shops must have a phone number": "phoneRequired",
  "enter a valid iraqi whatsapp number (+9647xxxxxxxxx)": "phoneInvalidFormat",
  "invalid phone number": "phoneInvalidFormat",
  "incorrect or expired code. request a new code if it has been more than 10 minutes.":
    "otpIncorrectOrExpired",
  "account disabled": "accountDisabled",
  unauthorized: "unauthorizedSession",
  forbidden: "forbiddenAction",
  "shop already exists": "shopAlreadyExists",
  "shop account required": "forbiddenAction",
  "owner account required": "forbiddenAction",
  "bid already exists for this post": "bidAlreadyExists",
  "post not open for bids": "postNotOpenForBids",
  "bid cannot be accepted": "bidCannotBeAccepted",
  "post is not active": "postNotActive",
  "only active posts can be edited": "cannotEditPost",
  "thread is locked by moderation": "threadLocked",
  "complete the job before rating": "completeJobBeforeRating",
  "you already reported this item": "alreadyReported",
  "at least one of repair or parts must remain enabled": "atLeastOneServiceRequired",
  "select at least one repair category": "repairCategoryRequired",
  "select at least one parts category": "partsCategoryRequired",
  "shop not found": "invalidShop",
  "shop profile not found": "invalidShop",
  "post not found": "postNotFound",
  "bid not found": "bidNotFound",
  "thread not found": "threadNotFound",
  "user not found": "userNotFound",
  "too many geocode requests": "geocodeRateLimited",
  "invalid image type": "invalidImageType",
  "media removed": "mediaRemoved",
  "geocoder error": "geocodeFailed",
};

/** First matching rule wins (more specific patterns first). */
const SUBSTRING_API_ERROR_RULES: ReadonlyArray<{
  includes: string;
  alsoIncludes?: string;
  key: StringKey;
}> = [
  { includes: "timed out", key: "requestTimedOut" },
  { includes: "network request failed", key: "networkRequestFailed" },
  { includes: "could not reach the server", key: "bootstrapNetworkErrorBody" },
  { includes: "already linked", key: "phoneInUse" },
  { includes: "already in use", key: "phoneInUse" },
  { includes: "phone number", alsoIncludes: "already", key: "phoneInUse" },
  { includes: "phone number", alsoIncludes: "required", key: "phoneRequired" },
  { includes: "+9647", key: "phoneInvalidFormat" },
  { includes: "whatsapp number", key: "phoneInvalidFormat" },
  { includes: "incorrect or expired code", key: "otpIncorrectOrExpired" },
  { includes: "otp send failed", key: "otpSendFailed" },
  { includes: "verify failed", key: "otpSendFailed" },
  { includes: "account disabled", key: "accountDisabled" },
  { includes: "shop already exists", key: "shopAlreadyExists" },
  { includes: "bid already exists", key: "bidAlreadyExists" },
  { includes: "not open for bids", key: "postNotOpenForBids" },
  { includes: "bid cannot be accepted", key: "bidCannotBeAccepted" },
  { includes: "post is not active", key: "postNotActive" },
  { includes: "thread is locked", key: "threadLocked" },
  { includes: "complete the job before rating", key: "completeJobBeforeRating" },
  { includes: "already reported", key: "alreadyReported" },
  { includes: "at least one of repair or parts", key: "atLeastOneServiceRequired" },
  { includes: "unauthorized", key: "unauthorizedSession" },
  { includes: "forbidden", key: "forbiddenAction" },
];

const UNHELPFUL_API_ERRORS = new Set([
  "",
  "failed",
  "invalid body",
  "validation failed",
  "request failed",
  "network request failed",
]);

/**
 * Map a raw API error string to a localized `StringKey`, or `null` if unknown.
 */
export function apiErrorKeyFromMessage(raw: string): StringKey | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const lower = trimmed.toLowerCase();
  const exact = EXACT_API_ERROR_KEYS[lower];
  if (exact) {
    return exact;
  }
  for (const rule of SUBSTRING_API_ERROR_RULES) {
    if (!lower.includes(rule.includes)) {
      continue;
    }
    if (rule.alsoIncludes && !lower.includes(rule.alsoIncludes)) {
      continue;
    }
    return rule.key;
  }
  return null;
}

/**
 * Map an unknown thrown value (usually from `apiFetch`) to a localized string.
 * Known server `error` payloads are translated; opaque zod / shape failures
 * fall back to `fallbackKey`.
 */
export function friendlyApiError(
  e: unknown,
  t: (k: StringKey) => string,
  fallbackKey: StringKey = "genericSaveFailed",
): string {
  if (e instanceof ApiTimeoutError) {
    return t("requestTimedOut");
  }
  const raw = e instanceof Error ? e.message.trim() : "";
  const lower = raw.toLowerCase();
  if (UNHELPFUL_API_ERRORS.has(lower)) {
    return t(fallbackKey);
  }
  const key = apiErrorKeyFromMessage(raw);
  if (key) {
    return t(key);
  }
  // Unknown English server text — never leak it to Arabic users.
  if (raw.length > 0) {
    return t(fallbackKey);
  }
  return t(fallbackKey);
}
