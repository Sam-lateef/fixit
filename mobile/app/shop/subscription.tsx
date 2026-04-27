import { Stack } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { ShopPaywall } from "@/components/ShopPaywall";
import { useSubscription } from "@/hooks/useSubscription";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

export default function ShopSubscriptionScreen(): React.ReactElement {
  const { t } = useI18n();
  const { isSubscribed, isLoading } = useSubscription();
  const [plansComingSoon, setPlansComingSoon] = useState(false);

  const openPlans = useCallback((): void => {
    setPlansComingSoon(true);
  }, []);

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
          {plansComingSoon ? (
            <Text style={styles.comingSoon}>{t("subscriptionComingSoon")}</Text>
          ) : null}
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
    textAlign: "left",
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
  comingSoon: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: "600",
    color: theme.muted,
    textAlign: "center",
  },
});
