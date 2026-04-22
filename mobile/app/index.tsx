import { router, type Href } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { resolveInitialRoute } from "@/lib/bootstrap";
import { getToken } from "@/lib/auth-storage";
import { isDevNavHubEnabled } from "@/lib/dev-nav-hub";
import { hasCompletedLocaleGate, setLocaleGateCompleted } from "@/lib/locale-gate";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

export default function IndexScreen(): React.ReactElement {
  const { t } = useI18n();

  useEffect(() => {
    void (async () => {
      if (isDevNavHubEnabled()) {
        router.replace("/dev");
        return;
      }
      let gateOk = await hasCompletedLocaleGate();
      if (!gateOk) {
        const token = await getToken();
        if (token) {
          await setLocaleGateCompleted();
          gateOk = true;
        }
      }
      if (!gateOk) {
        router.replace("/language-gate");
        return;
      }
      const target = await resolveInitialRoute();
      if (target.path === "/signup/owner-location") {
        router.replace({
          pathname: "/signup/owner-location",
          params: { city: target.params.city },
        });
        return;
      }
      router.replace(target.path as Href);
    })();
  }, []);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t("appName")}</Text>
      <Text style={styles.tag}>{t("tagline")}</Text>
      <ActivityIndicator
        color={theme.primaryMid}
        style={styles.spin}
        size="large"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.surface,
    padding: 24,
  },
  title: { fontSize: 26, fontWeight: "800", color: theme.primary, marginTop: 8 },
  tag: {
    fontSize: 14,
    color: theme.mutedLight,
    marginTop: 8,
    textAlign: "center",
  },
  spin: { marginTop: 32 },
});
