import { router } from "expo-router";

import { hrefAuthWelcome } from "@/lib/routes-href";
import {
  getApiBaseUrl,
  getApiTunnelMisconfigMessage,
  getPhysicalDeviceApiMisconfigMessage,
  parseApiResponseBody,
} from "./api-base";
import { clearToken, getToken } from "./auth-storage";
import { isDevNavHubEnabled } from "./dev-nav-hub";

export type ApiError = { error: string; details?: unknown };

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const base = getApiBaseUrl();
  const physicalMsg = getPhysicalDeviceApiMisconfigMessage(base);
  if (physicalMsg) {
    throw new Error(physicalMsg);
  }
  const tunnelMsg = getApiTunnelMisconfigMessage(base);
  if (tunnelMsg) {
    throw new Error(tunnelMsg);
  }
  const url = `${base}${path}`;
  const headers = new Headers(init.headers);
  if (
    !headers.has("Content-Type") &&
    init.body !== undefined &&
    init.body !== null
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (!init.skipAuth) {
    const token = await getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) {
    if (!isDevNavHubEnabled()) {
      await clearToken();
      router.replace(hrefAuthWelcome);
    }
  }
  const text = await res.text();
  const data = parseApiResponseBody(text, url);
  if (!res.ok) {
    const err = data as ApiError;
    throw new Error(err?.error ?? res.statusText);
  }
  return data as T;
}

export function formatIqd(n: number): string {
  return `${n.toLocaleString("en-US")} د.ع`;
}
