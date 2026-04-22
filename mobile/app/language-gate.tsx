import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setLocaleGateCompleted } from "@/lib/locale-gate";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

export default function LanguageGateScreen(): React.ReactElement {
  const { t, setLocale } = useI18n();

  function choose(loc: "en" | "ar-iq"): void {
    setLocale(loc);
    void (async () => {
      await setLocaleGateCompleted();
      router.replace("/");
    })();
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.wrap}>
        <View style={styles.brandWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>🔧</Text>
          </View>
          <Text style={styles.brandName}>{t("appName")}</Text>
          <Text style={styles.brandTag}>{t("tagline")}</Text>
        </View>
        <Text style={styles.title}>{t("chooseLanguageTitle")}</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.btn}
          onPress={() => choose("ar-iq")}
        >
          <Text style={styles.btnText}>{t("arabic")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => choose("en")}
        >
          <Text style={[styles.btnText, styles.btnTextSecondary]}>
            {t("english")}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.surface },
  wrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 48,
  },
  brandWrap: { alignItems: "center", marginBottom: 28 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoIcon: { fontSize: 32 },
  brandName: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.primary,
    letterSpacing: 0.5,
  },
  brandTag: {
    fontSize: 13,
    color: theme.muted,
    marginTop: 4,
    textAlign: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.text,
    textAlign: "center",
    marginBottom: 20,
  },
  btn: {
    backgroundColor: theme.primaryMid,
    paddingVertical: 16,
    borderRadius: theme.radiusMd,
    alignItems: "center",
    marginTop: 12,
  },
  btnSecondary: {
    backgroundColor: theme.chip,
    borderWidth: 1,
    borderColor: theme.border,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  btnTextSecondary: { color: theme.text },
});
