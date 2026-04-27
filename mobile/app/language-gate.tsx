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
        {/* Three vertical zones: icon top, brand middle, buttons bottom. */}
        <View style={styles.iconWrap}>
          <Text style={styles.logoIcon}>🔧</Text>
        </View>

        <View style={styles.brandWrap}>
          {/* Show both names on the very first screen — the user hasn't
              picked a language yet, so don't gate the brand on locale. */}
          <Text style={styles.brandName}>صلّحها</Text>
          <Text style={styles.brandNameEn}>FIX IT</Text>
          <Text style={styles.brandTag}>سوق إصلاح السيارات وقطع الغيار</Text>
          <Text style={styles.brandTagEn}>Car repair and parts marketplace</Text>
        </View>

        <View style={styles.actions}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.surface },
  wrap: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  // Match auth/login screen: icon, brand and buttons grouped as one
  // centered column with breathing-room gaps between zones.
  iconWrap: { alignItems: "center", marginBottom: 28 },
  brandWrap: { alignItems: "center", marginBottom: 40 },
  actions: {},
  logoIcon: { fontSize: 72 },
  brandName: {
    fontSize: 30,
    fontWeight: "800",
    color: theme.primary,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  brandNameEn: {
    fontSize: 30,
    fontWeight: "800",
    color: theme.primary,
    letterSpacing: 0.5,
    textAlign: "center",
    marginTop: 14,
  },
  brandTag: {
    fontSize: 13,
    color: theme.muted,
    marginTop: 10,
    textAlign: "center",
  },
  brandTagEn: {
    fontSize: 13,
    color: theme.muted,
    marginTop: 2,
    textAlign: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
    textAlign: "center",
    marginBottom: 16,
  },
  // Button geometry matched to auth/login screen for visual parity.
  btn: {
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
    marginBottom: 12,
  },
  btnSecondary: {
    backgroundColor: theme.chip,
    borderWidth: 1,
    borderColor: theme.border,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnTextSecondary: { color: theme.text },
});
