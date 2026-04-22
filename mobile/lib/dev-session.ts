import {
  getApiBaseUrl,
  getApiTunnelMisconfigMessage,
  getPhysicalDeviceApiMisconfigMessage,
  parseApiResponseBody,
} from "./api-base";
import { setToken } from "./auth-storage";

/**
 * Dev-only: obtain JWT from API without OTP (requires DEV_ALLOW_SESSION_LOGIN on API).
 */
export async function devSessionLogin(
  role: "OWNER" | "SHOP",
): Promise<void> {
  const base = getApiBaseUrl();
  const physicalMsg = getPhysicalDeviceApiMisconfigMessage(base);
  if (physicalMsg) {
    throw new Error(physicalMsg);
  }
  const tunnelMsg = getApiTunnelMisconfigMessage(base);
  if (tunnelMsg) {
    throw new Error(tunnelMsg);
  }
  const url = `${base}/api/v1/dev/session`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  const text = await res.text();
  const data = parseApiResponseBody(text, url);
  if (!res.ok) {
    const err = data as { error?: string } | null;
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  const token = (data as { token: string }).token;
  if (!token) {
    throw new Error("No token in dev session response");
  }
  await setToken(token);
}
