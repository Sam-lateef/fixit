import type { ReactElement } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { hrefAuthWelcome } from "@/lib/routes-href";
import { signOutFromApp } from "@/lib/sign-out";
import { useI18n } from "@/lib/i18n";

export function HeaderBackButton(): ReactElement {
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("back")}
      hitSlop={12}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace(hrefAuthWelcome);
        }
      }}
      style={styles.btn}
    >
      <Text style={styles.backText}>‹ {t("back")}</Text>
    </Pressable>
  );
}

export function HeaderLogoutButton(): ReactElement {
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("logout")}
      hitSlop={12}
      onPress={() => {
        void (async () => {
          await signOutFromApp();
          router.replace(hrefAuthWelcome);
        })();
      }}
      style={styles.btn}
    >
      <Text style={styles.logoutText}>{t("logout")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 6, paddingHorizontal: 4 },
  backText: { fontSize: 16, color: "#fff", fontWeight: "600" },
  logoutText: { fontSize: 15, color: "#fff", fontWeight: "700" },
});
