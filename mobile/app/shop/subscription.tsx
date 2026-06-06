import { Redirect } from "expo-router";

/**
 * Phase 1: the in-app subscription UI is hidden — subscriptions are managed
 * from the web dashboard (see the "Web dashboard" row on the shop profile).
 *
 * The route file is intentionally kept so file-based routing does not 404 if
 * an old notification, web deep link, or in-app navigation ever lands here.
 * The underlying `SubscriptionProvider`, `useSubscription`, RevenueCat client,
 * `ShopPaywall`, and `ShopPremiumGate` are all preserved in the code so this
 * screen can be restored from git history when subscriptions move back into
 * the app.
 */
export default function ShopSubscriptionScreen(): React.ReactElement {
  return <Redirect href="/shop/profile" />;
}
