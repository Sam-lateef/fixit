import { Stack } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ShopPaywall } from "@/components/ShopPaywall";
import { useSubscription } from "@/hooks/useSubscription";
import { useI18n } from "@/lib/i18n";
import { isRevenueCatConfigured } from "@/lib/revenuecat";
import { presentRevenueCatDashboardPaywall } from "@/lib/revenuecat-paywall";
import { theme } from "@/lib/theme";

export default function ShopSubscriptionScreen(): React.ReactElement {
  const { t } = useI18n();
  const { isSubscribed, isLoading, refresh } = useSubscription();

  const openPlans = useCallback((): void => {
    if (Platform.OS === "web") {
      return;
    }
    if (!isRevenueCatConfigured()) {
      Alert.alert(t("errorTitle"), t("revenueCatKeysMissing"));
      return;
    }
    void (async () => {
      try {
        const ok = await presentRevenueCatDashboardPaywall();
        if (ok) {
          await refresh();
        }
      } catch (e) {
        Alert.alert(
          t("errorTitle"),
          e instanceof Error ? e.message : t("updateFailed"),
        );
      }
    })();
  }, [refresh, t]);

  return (
    <>
      <Stack.Screen
        options={{
          title: t("shopSubscriptionSection"),
        }}
      />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primaryMid} />
          <Text style={styles.muted}>{t("loading")}</Text>
        </View>
      ) : isSubscribed ? (
        <View style={styles.padded}>
          <Text style={styles.title}>{t("shopSubscriptionActiveHint")}</Text>
          <Text style={styles.body}>{t("shopSubscriptionManageHint")}</Text>
          <Pressable style={styles.primaryBtn} onPress={openPlans}>
            <Text style={styles.primaryBtnText}>{t("openSubscriptionPlans")}</Text>
          </Pressable>
        </View>
      ) : (
        <ShopPaywall />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.bg,
    padding: 24,
  },
  muted: { marginTop: 12, color: theme.muted, fontSize: 14 },
  padded: {
    flex: 1,
    backgroundColor: theme.bg,
    padding: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    color: theme.muted,
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
