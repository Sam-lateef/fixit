import { signOut } from "firebase/auth";
import { Platform } from "react-native";

import { clearToken } from "@/lib/auth-storage";
import { getFirebaseAuth, isFirebaseClientConfigured } from "@/lib/firebase";
import { syncRevenueCatUser } from "@/lib/revenuecat";

/**
 * Clears the Google account cached on the device so the next sign-in can show the account picker.
 * No-op in Expo Go / web (native module unavailable).
 */
async function signOutGoogleNativeSdkIfAvailable(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  try {
    const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
    await GoogleSignin.signOut();
  } catch {
    /* Expo Go, missing native module, or not signed in with Google */
  }
}

/**
 * Clears API JWT, signs out of Firebase (if configured), native Google session (account picker next time),
 * and RevenueCat on native.
 */
export async function signOutFromApp(): Promise<void> {
  await clearToken();
  if (isFirebaseClientConfigured()) {
    try {
      const auth = getFirebaseAuth();
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {
      /* non-fatal */
    }
  }
  await signOutGoogleNativeSdkIfAvailable();
  if (Platform.OS !== "web") {
    try {
      await syncRevenueCatUser(null);
    } catch {
      /* non-fatal */
    }
  }
}
