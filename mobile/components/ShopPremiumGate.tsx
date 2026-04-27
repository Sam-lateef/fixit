type Props = {
  children: React.ReactNode;
};

/**
 * Shop-only premium gate.
 *
 * LAUNCH NOTE (2026-04): app is free during initial rollout — paywall is
 * disabled and this component always renders children. Restore the
 * `useSubscription()` + `<ShopPaywall />` logic from git history when
 * subscriptions are turned back on (likely added back to settings then).
 */
export function ShopPremiumGate(props: Props): React.ReactElement {
  return <>{props.children}</>;
}
