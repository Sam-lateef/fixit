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

/** Default per-request timeout. Long-running uploads should override via `timeoutMs`. */
const DEFAULT_API_TIMEOUT_MS = 15_000;

/** Thrown when a request exceeds its configured timeout. Distinguishable from
 *  generic network errors so callers can render a tailored message. */
export class ApiTimeoutError extends Error {
  constructor(ms: number) {
    super(`Request timed out after ${Math.round(ms / 1000)}s`);
    this.name = "ApiTimeoutError";
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean; timeoutMs?: number } = {},
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
  const timeoutMs = init.timeoutMs ?? DEFAULT_API_TIMEOUT_MS;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
  // If the caller passed its own signal, abort our timeout controller when
  // theirs aborts so we don't leak it; we always forward our combined signal
  // to fetch. If only one signal is passed, use it directly.
  const callerSignal = init.signal;
  if (callerSignal) {
    if (callerSignal.aborted) {
      timeoutController.abort();
    } else {
      callerSignal.addEventListener("abort", () => timeoutController.abort(), {
        once: true,
      });
    }
  }
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers,
      signal: timeoutController.signal,
    });
  } catch (e) {
    if (timeoutController.signal.aborted && !callerSignal?.aborted) {
      throw new ApiTimeoutError(timeoutMs);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
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
