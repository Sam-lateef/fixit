import Constants, { AppOwnership, ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

/**
 * True when the project runs inside the Expo Go host app (OAuth must use https://auth.expo.io/…).
 * Uses `appOwnership` and `executionEnvironment` because some devices only set one reliably.
 */
export function isRunningInExpoGo(): boolean {
  if (Platform.OS === "web") {
    return false;
  }
  return (
    Constants.appOwnership === AppOwnership.Expo ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

function readMergedExtra(): Record<string, unknown> | undefined {
  const ec = Constants.expoConfig;
  if (ec !== null && typeof ec === "object" && "extra" in ec) {
    const ex = (ec as { extra?: unknown }).extra;
    if (ex !== null && typeof ex === "object") {
      return ex as Record<string, unknown>;
    }
  }
  const m2 = Constants.manifest2;
  if (m2 !== null && typeof m2 === "object" && "extra" in m2) {
    const root = (m2 as { extra?: { expoClient?: { extra?: unknown } } }).extra;
    const nested = root?.expoClient?.extra;
    if (nested !== null && typeof nested === "object") {
      return nested as Record<string, unknown>;
    }
  }
  return undefined;
}

function readExpoProjectFullName(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_EXPO_PROJECT_FULL_NAME?.trim();
  if (typeof fromEnv === "string" && fromEnv.length > 0) {
    return fromEnv;
  }
  const extra = readMergedExtra();
  const fromExtra = extra?.expoProjectFullName;
  if (typeof fromExtra === "string" && fromExtra.length > 0) {
    return fromExtra;
  }
  const fromManifest = Constants.expoConfig?.originalFullName;
  if (typeof fromManifest === "string" && fromManifest.length > 0) {
    return fromManifest;
  }
  return undefined;
}

/**
 * Returns the redirect URI Google OAuth must use for Expo Go.
 * Web OAuth clients only allow http(s) redirects; the default `exp://…` URI is rejected (400 invalid_request).
 * The Expo proxy at `https://auth.expo.io/…` forwards back to the dev client.
 *
 * For standalone / dev-client builds, return `undefined` so `expo-auth-session` uses the native
 * `…:/oauthredirect` URI with the platform OAuth client IDs.
 *
 * @see https://docs.expo.dev/guides/authentication/#google
 */
export function getGoogleOAuthRedirectUri(): string | undefined {
  if (Platform.OS === "web") {
    return undefined;
  }
  if (!isRunningInExpoGo()) {
    return undefined;
  }
  const fullName = readExpoProjectFullName();
  if (typeof fullName !== "string" || fullName.length === 0) {
    return undefined;
  }
  return `https://auth.expo.io/${fullName}`;
}

/**
 * True when running in Expo Go but no `https://auth.expo.io/…` redirect can be built
 * (`npx expo login` / `EXPO_PUBLIC_EXPO_PROJECT_FULL_NAME` missing). Google sign-in would use `exp://…` and fail.
 */
/**
 * Use `@react-native-google-signin/google-signin` (dev / release builds). Expo Go cannot load this native module.
 */
export function shouldUseNativeGoogleSignIn(): boolean {
  if (Platform.OS === "web") {
    return false;
  }
  return !isRunningInExpoGo();
}

export function isExpoGoMissingGoogleProxyRedirect(): boolean {
  if (Platform.OS === "web") {
    return false;
  }
  if (!isRunningInExpoGo()) {
    return false;
  }
  return getGoogleOAuthRedirectUri() === undefined;
}
