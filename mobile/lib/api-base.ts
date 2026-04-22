import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

/**
 * Metro / Expo dev server host (no port). Used to guess where the API runs (same machine, port 3000).
 */
function metroLanHost(): string | undefined {
  const raw = Constants.expoConfig?.hostUri;
  const host = raw?.split(":")[0]?.trim();
  if (!host || host === "localhost" || host === "127.0.0.1") {
    return undefined;
  }
  return host;
}

/**
 * Ensures LAN values like `192.168.x.x:3000` become valid origins (`http://...`) for fetch and `new URL()`.
 */
export function normalizeExpoPublicApiOrigin(raw: string | undefined): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const trimmed = raw.trim().replace(/\/$/, "");
  if (trimmed.length === 0) {
    return undefined;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `http://${trimmed}`;
}

/** Set in mobile/.env as EXPO_PUBLIC_API_URL and mirrored in app.config.js → extra.fixitApiBaseUrl */
function explicitApiBaseUrl(): string | undefined {
  const fromEnv = normalizeExpoPublicApiOrigin(process.env.EXPO_PUBLIC_API_URL);
  if (fromEnv !== undefined && fromEnv.length > 0) {
    return fromEnv;
  }
  const fromExtra = normalizeExpoPublicApiOrigin(
    (Constants.expoConfig?.extra as { fixitApiBaseUrl?: string } | undefined)
      ?.fixitApiBaseUrl,
  );
  if (fromExtra !== undefined && fromExtra.length > 0) {
    return fromExtra;
  }
  return undefined;
}

/**
 * Tunnel hostnames reach Metro over the internet, but your Fastify API on :3000 is not on that tunnel —
 * fetch often returns an HTML error page → "Unexpected token '<'" when parsing JSON.
 */
/**
 * Physical phones cannot use localhost / 10.0.2.2 to reach a dev API on your PC.
 * Call after computing base URL when EXPO_PUBLIC_API_URL is not set.
 */
export function getPhysicalDeviceApiMisconfigMessage(baseUrl: string): string | null {
  if (!__DEV__) {
    return null;
  }
  if (explicitApiBaseUrl()) {
    return null;
  }
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return null;
  }
  if (!Device.isDevice) {
    return null;
  }
  const pointsAtLoopbackOrEmulatorBridge =
    /\blocalhost\b/i.test(baseUrl) ||
    baseUrl.includes("127.0.0.1") ||
    baseUrl.includes("10.0.2.2");
  if (!pointsAtLoopbackOrEmulatorBridge) {
    return null;
  }
  return [
    "This is a physical phone: localhost and 10.0.2.2 do not reach your PC’s API.",
    "1) In mobile/.env set: EXPO_PUBLIC_API_URL=http://YOUR_PC_LAN_IP:3000",
    "   (Windows: ipconfig → IPv4 Address; same Wi-Fi as the phone.)",
    "2) Run: npm run dev:api from the repo root.",
    "3) Restart Metro (stop and npx expo start --lan).",
    `Current broken base: ${baseUrl}`,
  ].join(" ");
}

export function getApiTunnelMisconfigMessage(baseUrl: string): string | null {
  if (!__DEV__) {
    return null;
  }
  if (/exp\.direct|ngrok|trycloudflare\.com|cloudflaretunnel\.com/i.test(baseUrl)) {
    return [
      "Expo tunnel cannot reach your Fix It API (port 3000).",
      "Fix: run Metro with LAN — npx expo start --lan",
      "or set EXPO_PUBLIC_API_URL=http://YOUR_PC_LAN_IP:3000 in mobile/.env (same Wi-Fi as the phone).",
    ].join(" ");
  }
  return null;
}

/**
 * Parse JSON from an API response body; surface HTML / wrong-server errors clearly.
 */
export function parseApiResponseBody(text: string, requestUrl: string): unknown {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.startsWith("<") || trimmed.startsWith("<!")) {
    throw new Error(
      [
        "Server returned HTML instead of JSON (wrong URL or not the API).",
        `Request: ${requestUrl}`,
        "Set EXPO_PUBLIC_API_URL=http://YOUR_PC_LAN_IP:3000 and run npm run dev:api.",
      ].join(" "),
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(
      `Invalid JSON from API. URL: ${requestUrl} Preview: ${trimmed.slice(0, 120)}`,
    );
  }
}

/**
 * API origin. Set `EXPO_PUBLIC_API_URL` in production.
 * Dev fallback: same LAN IP as Metro, port 3000; Android emulator → 10.0.2.2.
 */
export function getApiBaseUrl(): string {
  const explicit = explicitApiBaseUrl();
  if (explicit) {
    return explicit;
  }
  if (!__DEV__) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is required in production builds.",
    );
  }
  const hostFromMetro = metroLanHost();
  if (hostFromMetro) {
    return `http://${hostFromMetro}:3000`;
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }
  return "http://localhost:3000";
}
