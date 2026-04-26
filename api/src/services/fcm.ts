import admin from "firebase-admin";
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
      },
    ]),
  });
  if (!res.ok) {
    console.warn(
      `[expo-push] send failed ${res.status} ${res.statusText}`,
      await res.text().catch(() => ""),
    );
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
