import { Platform } from "react-native";

let cachedResult: boolean | null = null;

/**
 * Native `@react-native-google-signin/google-signin` depends on Google Mobile Services (Play Store stack).
 * Huawei / some enterprise devices omit it; use browser OAuth (`GoogleOAuthButton`) instead.
 */
export async function isAndroidGooglePlayServicesAvailable(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return true;
  }
  if (cachedResult !== null) {
    return cachedResult;
  }
  try {
    const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
    cachedResult = true;
    return true;
  } catch {
    cachedResult = false;
    return false;
  }
}
