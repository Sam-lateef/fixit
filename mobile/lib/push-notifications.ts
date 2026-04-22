import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

import { apiFetch } from "@/lib/api";

type LinkingWithSendIntent = typeof Linking & {
  sendIntent?: (
    action: string,
    extras?: ReadonlyArray<{ key: string; value: string }>,
  ) => Promise<void>;
};

/**
 * Opens the OS screen where the user can enable or change notification permission
 * for this app (not the generic Android “App info” page when avoidable).
 */
export async function openAppNotificationSettings(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  if (Platform.OS === "ios") {
    try {
      await Linking.openURL("app-settings:");
    } catch {
      await Linking.openSettings();
    }
    return;
  }

  const pkg =
    typeof Constants.expoConfig?.android?.package === "string" &&
    Constants.expoConfig.android.package.length > 0
      ? Constants.expoConfig.android.package
      : "com.fixitiq.app";

  const linking = Linking as LinkingWithSendIntent;
  if (typeof linking.sendIntent === "function") {
    try {
      await linking.sendIntent("android.settings.APP_NOTIFICATION_SETTINGS", [
        { key: "android.provider.extra.APP_PACKAGE", value: pkg },
      ]);
      return;
    } catch {
      /* fall through */
    }
  }

  const intentUri = `intent:#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;S.android.provider.extra.APP_PACKAGE=${pkg};end`;
  try {
    await Linking.openURL(intentUri);
  } catch {
    await Linking.openSettings();
  }
}

/**
 * Call after the user is authenticated.
 * Requests permission, gets the raw FCM/APNs device token,
 * and saves it to the backend via PUT /api/v1/users/me.
 */
export async function registerPushToken(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return; // User declined — silent, no error
    }

    // Get the raw device push token (FCM on Android, APNs on iOS)
    // Requires google-services.json (Android) / APNs config (iOS)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const fcmToken = tokenData.data as string;

    if (!fcmToken) return;

    await apiFetch("/api/v1/users/me", {
      method: "PUT",
      body: JSON.stringify({ fcmToken }),
    });
  } catch (e) {
    // Graceful no-op — push is optional, don't crash the app
    console.warn("[push] registerPushToken failed:", e);
  }
}

/**
 * Configure how notifications appear while the app is foregrounded.
 * Call once at app startup (before any screen renders).
 */
export function configureForegroundNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}
