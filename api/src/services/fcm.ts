import admin from "firebase-admin";
import { ensureFirebaseAdminInitialized } from "./firebase-app.js";

export function isFcmConfigured(): boolean {
  return ensureFirebaseAdminInitialized();
}

export async function sendPush(
  fcmToken: string,
  title: string,
  body: string,
  data: Record<string, string> | undefined,
  highPriority: boolean,
): Promise<void> {
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
