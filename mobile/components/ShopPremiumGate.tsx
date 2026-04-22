import { ActivityIndicator, StyleSheet, View } from "react-native";

import { ShopPaywall } from "@/components/ShopPaywall";
import { useSubscription } from "@/hooks/useSubscription";
import { isDevShopPaywallBypassed } from "@/lib/dev-nav-hub";
import { theme } from "@/lib/theme";

type Props = {
  children: React.ReactNode;
};

/**
 * Shop-only: shows the paywall when `shop_pro` is not active.
 * Use around feed, bids, inbox, and bid flow — not profile.
 */
export function ShopPremiumGate(props: Props): React.ReactElement {
  const { isSubscribed, isLoading, isReady } = useSubscription();

  if (isDevShopPaywallBypassed()) {
    return <>{props.children}</>;
  }

  if (!isReady || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primaryMid} />
      </View>
    );
  }

  if (!isSubscribed) {
    return <ShopPaywall />;
  }

  return <>{props.children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.bg,
  },
});
