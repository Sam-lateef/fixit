import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

/**
 * Must match the entitlement identifier in RevenueCat (e.g. "FixIT Pro").
 * Override with EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID if needed.
 */
export const SHOP_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim() || "FixIT Pro";

function getApiKey(): string | undefined {
  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS?.trim();
  }
  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID?.trim();
  }
  return undefined;
}

/** True when this native build has a RevenueCat SDK key (Purchases.configure will run). */
export function isRevenueCatConfigured(): boolean {
  if (Platform.OS === "web") {
    return false;
  }
  return Boolean(getApiKey());
}

/**
 * Call once at startup. Uses EXPO_PUBLIC_REVENUECAT_API_KEY_IOS / ANDROID.
 * No-op on web; logs a warning if keys are missing on native.
 */
export async function configureRevenueCat(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn(
      "[RevenueCat] Set EXPO_PUBLIC_REVENUECAT_API_KEY_IOS and EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID",
    );
    return;
  }
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
  }
  Purchases.configure({ apiKey });
}

export type RevenueCatUser = {
  id: string;
  userType: "OWNER" | "SHOP";
};

/**
 * Links RevenueCat to the backend user. Shop accounts use `logIn(userId)`;
 * owners are logged out of RevenueCat so subscriptions stay shop-only.
 */
export async function syncRevenueCatUser(
  user: RevenueCatUser | null,
): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  try {
    if (!user) {
      await Purchases.logOut();
      return;
    }
    if (user.userType === "SHOP") {
      await Purchases.logIn(user.id);
    } else {
      await Purchases.logOut();
    }
  } catch (e) {
    console.warn("[RevenueCat] syncRevenueCatUser failed", e);
  }
}
