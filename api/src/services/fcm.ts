import admin from "firebase-admin";
import { prisma } from "../db/prisma.js";
import { ensureFirebaseAdminInitialized } from "./firebase-app.js";

export function isFcmConfigured(): boolean {
  return ensureFirebaseAdminInitialized();
}

/** Detect Expo push tokens (start with "ExponentPushToken[" or "ExpoPushToken["). */
function isExpoPushToken(token: string): boolean {
  return (
    token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[")
  );
}

/** Last 6 chars of an ExponentPushToken — enough to disambiguate in logs without dumping the full token. */
function tokenSuffix(token: string): string {
  return token.length > 8 ? `...${token.slice(-8)}` : token;
}

type ExpoTicket = {
  status?: string;
  id?: string;
  message?: string;
  details?: { error?: string; [k: string]: unknown };
};

/**
 * Clear an invalid push token from any user holding it. Used when Expo reports
 * DeviceNotRegistered — the user uninstalled, signed out, or rotated tokens.
 */
async function clearStaleToken(token: string): Promise<void> {
  try {
    const result = await prisma.user.updateMany({
      where: { fcmToken: token },
      data: { fcmToken: null },
    });
    if (result.count > 0) {
      console.info(
        `[expo-push] cleared stale token ${tokenSuffix(token)} from ${result.count} user(s)`,
      );
    }
  } catch (e) {
    console.warn("[expo-push] failed to clear stale token", e);
  }
}

async function sendViaExpo(
  token: string,
  title: string,
  body: string,
  data: Record<string, string> | undefined,
  highPriority: boolean,
): Promise<void> {
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    body: JSON.stringify([
      {
        to: token,
        title,
        body,
        data,
        sound: "default",
        priority: highPriority ? "high" : "default",
        // Route Android tray + heads-up through our MAX-importance channel.
        channelId: "default",
      },
    ]),
  });

  const rawBody = await res.text().catch(() => "");

  if (!res.ok) {
    console.warn(
      `[expo-push] send failed ${res.status} ${res.statusText} for ${tokenSuffix(token)}: ${rawBody}`,
    );
    return;
  }

  let parsed: { data?: ExpoTicket | ExpoTicket[]; errors?: unknown[] } | null = null;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    console.warn(`[expo-push] non-JSON response for ${tokenSuffix(token)}: ${rawBody}`);
    return;
  }

  if (!parsed) return;

  if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
    console.warn(`[expo-push] top-level errors for ${tokenSuffix(token)}:`, parsed.errors);
    return;
  }

  const tickets: ExpoTicket[] = Array.isArray(parsed.data)
    ? parsed.data
    : parsed.data
      ? [parsed.data]
      : [];

  for (const ticket of tickets) {
    if (ticket.status === "error") {
      const errCode = ticket.details?.error ?? "unknown";
      console.warn(
        `[expo-push] ticket error for ${tokenSuffix(token)}: ${errCode} — ${ticket.message ?? ""}`,
      );
      if (errCode === "DeviceNotRegistered") {
        await clearStaleToken(token);
      }
    }
  }
}

export async function sendPush(
  fcmToken: string,
  title: string,
  body: string,
  data: Record<string, string> | undefined,
  highPriority: boolean,
): Promise<void> {
  if (isExpoPushToken(fcmToken)) {
    await sendViaExpo(fcmToken, title, body, data, highPriority);
    return;
  }
  if (!ensureFirebaseAdminInitialized()) {
    console.warn("[fcm] Skip push — FIREBASE_SERVICE_ACCOUNT_JSON not set");
    return;
  }
  await admin.messaging().send({
    token: fcmToken,
    notification: { title, body },
    data,
    android: { priority: highPriority ? "high" : "normal" },
    apns: {
      payload: { aps: { sound: "default", badge: 1 } },
      headers: highPriority ? { "apns-priority": "10" } : {},
    },
  });
}
