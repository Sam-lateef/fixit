import type { PushEventType } from "@/lib/push-events";

const PUSH_EVENT_TYPES: ReadonlySet<PushEventType> = new Set([
  "BID",
  "ACCEPT",
  "CHAT",
  "REPAIR",
  "PARTS",
  "TOWING",
]);

function isPushEventType(value: string): value is PushEventType {
  return PUSH_EVENT_TYPES.has(value as PushEventType);
}

/**
 * Read the push event type from Expo notification `content.data`.
 * Handles plain objects and occasional Android FCM stringified bodies.
 */
export function extractPushEventType(data: unknown): PushEventType | null {
  if (data === null || typeof data !== "object") {
    return null;
  }
  const record = data as Record<string, unknown>;
  const candidates = [record.type, record.pushType, record.eventType];
  for (const raw of candidates) {
    if (typeof raw === "string" && isPushEventType(raw)) {
      return raw;
    }
  }
  if (typeof record.body === "string") {
    try {
      return extractPushEventType(JSON.parse(record.body) as unknown);
    } catch {
      return null;
    }
  }
  return null;
}
