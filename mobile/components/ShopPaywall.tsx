import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useSubscription } from "@/hooks/useSubscription";
import { useI18n } from "@/lib/i18n";
import { presentRevenueCatDashboardPaywall } from "@/lib/revenuecat-paywall";
import { SHOP_ENTITLEMENT_ID } from "@/lib/revenuecat";
import { theme } from "@/lib/theme";

/**
 * Full-screen gate: opens RevenueCat dashboard paywall (react-native-purchases-ui).
 * Active entitlement in code: {@link SHOP_ENTITLEMENT_ID} (e.g. "FixIT Pro").
 */
export function ShopPaywall(): React.ReactElement {
  const { t } = useI18n();
  const { restorePurchases, isLoading: subLoading, refresh } =
    useSubscription();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function openNativePaywall(): Promise<void> {
    setErr("");
    setBusy(true);
    try {
      const unlocked = await presentRevenueCatDashboardPaywall();
      if (unlocked) {
        await refresh();
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Paywall unavailable. Use a dev/production build (not Expo Go).";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  if (subLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primaryMid} />
        <Text style={styles.muted}>{t("loading")}</Text>
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{t("paywallTitle")}</Text>
        <Text style={styles.body}>{t("paywallWebHint")}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.subtitle}>{t("paywallSubtitle")}</Text>
      {__DEV__ ? (
        <Text style={styles.hint}>Entitlement id: {SHOP_ENTITLEMENT_ID}</Text>
      ) : null}
      <Pressable
        style={[styles.primaryBtn, busy && styles.btnDisabled]}
        disabled={busy}
        onPress={() => void openNativePaywall()}
      >
        <Text style={styles.primaryBtnText}>{t("subscribeNow")}</Text>
      </Pressable>
      <Pressable
        style={styles.restore}
        disabled={busy}
        onPress={() => {
          setErr("");
          setBusy(true);
          void (async () => {
            try {
              await restorePurchases();
              await refresh();
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Restore failed");
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        <Text style={styles.restoreText}>{t("restorePurchases")}</Text>
      </Pressable>
      {err ? <Text style={styles.err}>{err}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 24,
    paddingBottom: 48,
    backgroundColor: theme.bg,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: theme.bg,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 8,
    textAlign: "left",
  },
  subtitle: {
    fontSize: 15,
    color: theme.muted,
    marginBottom: 8,
    lineHeight: 22,
    textAlign: "left",
  },
  hint: {
    fontSize: 12,
    color: theme.mutedLight,
    marginBottom: 20,
    textAlign: "left",
  },
  body: { marginTop: 12, color: theme.muted, textAlign: "center" },
  muted: { marginTop: 12, color: theme.muted },
  primaryBtn: {
    backgroundColor: theme.primaryMid,
    padding: 16,
    borderRadius: theme.radiusMd,
    marginBottom: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  btnDisabled: { opacity: 0.6 },
  restore: { marginTop: 16, padding: 12, alignItems: "center" },
  restoreText: { color: theme.muted, fontWeight: "600", fontSize: 14 },
  err: { marginTop: 12, color: theme.danger, fontSize: 13, textAlign: "center" },
});
