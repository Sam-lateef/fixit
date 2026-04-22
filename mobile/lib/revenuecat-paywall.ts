import { Platform } from "react-native";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

import { isRevenueCatConfigured } from "@/lib/revenuecat";

export function paywallResultUnlocked(result: PAYWALL_RESULT): boolean {
  return (
    result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED
  );
}

/**
 * Presents the RevenueCat dashboard paywall. Returns true if user purchased or restored.
 */
export async function presentRevenueCatDashboardPaywall(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }
  if (!isRevenueCatConfigured()) {
    throw new Error(
      "RevenueCat is not configured for this build. Set EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID or EXPO_PUBLIC_REVENUECAT_API_KEY_IOS in mobile/.env and rebuild the app.",
    );
  }
  const result = await RevenueCatUI.presentPaywall();
  return paywallResultUnlocked(result);
}
