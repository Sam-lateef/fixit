import Constants from "expo-constants";
import { Platform } from "react-native";

import { getApiBaseUrl } from "./api-base";

/**
 * Signup-flow telemetry. Every event is:
 *   1. echoed to the JS console with a `[signup]` tag (visible in Metro / logcat / Xcode)
 *   2. POSTed fire-and-forget to /api/v1/diagnostics/signup-breadcrumb so we
 *      can see tester sessions in Fly logs even when we have no device access
 *
 * A session id is generated lazily and reused across every signup screen so
 * a tester's breadcrumbs can be grouped. `resetSignupSession()` is called by
 * the auth screens when a new phone number is entered so a single device can
 * produce multiple distinct signup sessions over its lifetime.
 *
 * The POST has a short timeout and swallows every error. Telemetry must never
 * be the thing that hangs signup.
 */

let sessionId: string | null = null;

function newSessionId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `sg_${t}_${r}`;
}

function ensureSessionId(): string {
  if (sessionId === null) {
    sessionId = newSessionId();
  }
  return sessionId;
}

/** Force a fresh session id on the next event. Call when a new phone is entered. */
export function resetSignupSession(): void {
  sessionId = null;
}

/** Current session id, or null if no event has been logged yet. */
export function getSignupSessionId(): string | null {
  return sessionId;
}

const TELEMETRY_TIMEOUT_MS = 4000;

function platformTag(): string {
  const v =
    typeof Platform.Version === "string" || typeof Platform.Version === "number"
      ? String(Platform.Version)
      : "";
  return v.length > 0 ? `${Platform.OS}:${v}` : Platform.OS;
}

function appVersion(): string | undefined {
  const v = Constants.expoConfig?.version;
  return typeof v === "string" ? v : undefined;
}

type Breadcrumb = {
  sessionId: string;
  event: string;
  ts: number;
  durationMs?: number;
  error?: string;
  data?: Record<string, unknown>;
  platform: string;
  appVersion?: string;
};

function postBreadcrumb(crumb: Breadcrumb): void {
  let base: string;
  try {
    base = getApiBaseUrl();
  } catch {
    return;
  }
  if (!base) return;
  const url = `${base}/api/v1/diagnostics/signup-breadcrumb`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TELEMETRY_TIMEOUT_MS);
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(crumb),
    signal: controller.signal,
  })
    .catch(() => {
      // Best-effort. Telemetry failures must never surface to the UI.
    })
    .finally(() => clearTimeout(timer));
}

function buildCrumb(
  event: string,
  extras: Partial<Breadcrumb>,
): Breadcrumb {
  return {
    sessionId: ensureSessionId(),
    event,
    ts: Date.now(),
    platform: platformTag(),
    appVersion: appVersion(),
    ...extras,
  };
}

/** One-shot event. Use for screen mounts and discrete steps that don't await. */
export function logSignup(
  event: string,
  data?: Record<string, unknown>,
): void {
  const crumb = buildCrumb(event, { data });
  if (data === undefined) {
    console.log(`[signup] ${event}`);
  } else {
    console.log(`[signup] ${event}`, data);
  }
  postBreadcrumb(crumb);
}

/**
 * Wraps an awaitable step. Logs `<event>:start`, then either `<event>:ok` with
 * duration or `<event>:err` with duration + error message. Re-throws so caller
 * logic is unchanged.
 */
export async function logSignupStep<T>(
  event: string,
  fn: () => Promise<T>,
  data?: Record<string, unknown>,
): Promise<T> {
  const start = Date.now();
  postBreadcrumb(buildCrumb(`${event}:start`, { data, ts: start }));
  if (data === undefined) {
    console.log(`[signup] ${event} start`);
  } else {
    console.log(`[signup] ${event} start`, data);
  }
  try {
    const result = await fn();
    const durationMs = Date.now() - start;
    postBreadcrumb(buildCrumb(`${event}:ok`, { data, durationMs }));
    console.log(`[signup] ${event} ok ${durationMs}ms`);
    return result;
  } catch (e) {
    const durationMs = Date.now() - start;
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    postBreadcrumb(buildCrumb(`${event}:err`, { data, durationMs, error: msg }));
    console.warn(`[signup] ${event} err ${durationMs}ms`, msg);
    throw e;
  }
}
