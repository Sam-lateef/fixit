/**
 * When enabled (__DEV__ + EXPO_PUBLIC_DEV_NAV_HUB=true), cold start opens /dev
 * with links to all main routes so you can review UI without auth.
 */
export function isDevNavHubEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_DEV_NAV_HUB === "true";
}

/** When true, shop feed/bid/inbox skip RevenueCat paywall (dev builds only). */
export function isDevShopPaywallBypassed(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_DEV_SKIP_SHOP_PAYWALL === "true";
}
