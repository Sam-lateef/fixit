import type { Href } from "expo-router";

import { extractPushEventType } from "@/lib/parse-push-notification-data";

/** Android notification channel — must match app.json expo-notifications defaultChannel. */
export const ANDROID_DEFAULT_PUSH_CHANNEL = "default";

let pendingHref: Href | null = null;

/** Store a route to open after splash/bootstrap (cold start from notification tap). */
export function stashNotificationRoute(href: Href): void {
  pendingHref = href;
}

/** Take and clear a route stashed during cold start. */
export function takeNotificationRoute(): Href | null {
  const href = pendingHref;
  pendingHref = null;
  return href;
}

function readThreadId(data: Record<string, unknown>): string | null {
  const raw = data.threadId;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Map push `data` to an in-app route. Returns null when no navigation applies
 * (caller should still emit pushEvents for list refresh).
 */
export function notificationHrefFromData(data: unknown): Href | null {
  if (data === null || typeof data !== "object") {
    return null;
  }
  const record = data as Record<string, unknown>;
  const type = extractPushEventType(data);
  if (!type) {
    return null;
  }

  if (type === "CHAT") {
    const threadId = readThreadId(record);
    return threadId ? (`/chat/${threadId}` as Href) : null;
  }
  if (type === "BID") {
    return "/owner" as Href;
  }
  if (type === "ACCEPT") {
    return "/shop/bids" as Href;
  }
  if (type === "REPAIR" || type === "PARTS" || type === "TOWING") {
    return "/shop" as Href;
  }
  return null;
}
