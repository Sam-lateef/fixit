/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

/**
 * Load mobile/.env into process.env so Expo config (and Metro) see the same values.
 * Fixes cases where EXPO_PUBLIC_* was set in .env but not picked up.
 */
function loadMobileEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key.length > 0) {
      process.env[key] = val;
    }
  }
}

loadMobileEnv();

/**
 * Match `normalizeExpoPublicApiOrigin` in `lib/api-base.ts` (LAN IP without scheme → http://).
 * @param {string} value
 * @returns {string}
 */
function normalizeExpoPublicApiOrigin(value) {
  const trimmed = String(value || "")
    .trim()
    .replace(/\/$/, "");
  if (trimmed.length === 0) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `http://${trimmed}`;
}

/**
 * @param {{ config: Record<string, unknown> }} ctx
 */
module.exports = ({ config }) => {
  const raw = normalizeExpoPublicApiOrigin(process.env.EXPO_PUBLIC_API_URL || "");
  const expoProjectFullName = (
    process.env.EXPO_PUBLIC_EXPO_PROJECT_FULL_NAME || ""
  ).trim();
  return {
    ...config,
    extra: {
      ...(typeof config.extra === "object" && config.extra !== null
        ? config.extra
        : {}),
      fixitApiBaseUrl: raw,
      /** Duplicated from env so Expo Go always reads it from Constants (Metro inlining can miss new keys). */
      expoProjectFullName:
        expoProjectFullName.length > 0 ? expoProjectFullName : undefined,
    },
  };
};
