import { getApiBaseUrl } from "@/lib/api-base";

const PREFIX = "[FixIt:ShopProfile]";

/**
 * Metro shows many JS messages as `WARN` (see RevenueCat in your terminal). We use `console.warn`
 * so shop traces are visible the same way. `console.log` is easy to miss or filter.
 *
 * Enable: default on when `__DEV__` is true. If you see no lines, set in `mobile/.env`:
 *   EXPO_PUBLIC_SHOP_PROFILE_LOGS=1
 * then restart Metro (`Ctrl+C`, `npx expo run:android` or `npx expo start`).
 * Disable: EXPO_PUBLIC_SHOP_PROFILE_LOGS=0
 */
function shopProfileLogsEnabled(): boolean {
  const forced = process.env.EXPO_PUBLIC_SHOP_PROFILE_LOGS?.trim();
  if (forced === "0" || forced === "false") {
    return false;
  }
  if (forced === "1" || forced === "true") {
    return true;
  }
  return typeof __DEV__ !== "undefined" && __DEV__;
}

/**
 * Tracing for shop profile (hero name, cover, GET /shops/me). In Metro, filter by: FixIt:ShopProfile
 */
export function shopDevLog(event: string, data?: Record<string, unknown>): void {
  if (!shopProfileLogsEnabled()) {
    return;
  }
  if (data !== undefined) {
    console.warn(PREFIX, event, data);
  } else {
    console.warn(PREFIX, event);
  }
}

/** Safe URL fingerprint: origin + truncated path (no query string). */
export function shopDevSummarizeUrl(url: string | null | undefined): string {
  if (url == null || url.trim() === "") {
    return "(empty)";
  }
  try {
    const u = new URL(url);
    const path =
      u.pathname.length > 72 ? `${u.pathname.slice(0, 72)}…` : u.pathname;
    return `${u.origin}${path}`;
  } catch {
    return "(unparseable-url)";
  }
}

export function shopDevLogApiBase(): void {
  if (!shopProfileLogsEnabled()) {
    return;
  }
  try {
    shopDevLog("apiBaseUrl", { base: getApiBaseUrl() });
  } catch (e) {
    shopDevLog("apiBaseUrl.error", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

export type ShopDevShopShape = {
  id: string;
  name: string;
  coverImageUrl?: string | null;
};

export function shopDevLogShopSnapshot(event: string, shop: ShopDevShopShape | null): void {
  if (!shopProfileLogsEnabled()) {
    return;
  }
  if (shop === null) {
    shopDevLog(event, { shop: null });
    return;
  }
  shopDevLog(event, {
    id: shop.id,
    name: shop.name,
    nameLen: shop.name.length,
    cover: shopDevSummarizeUrl(shop.coverImageUrl ?? null),
  });
}
