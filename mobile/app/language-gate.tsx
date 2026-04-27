import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
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
          <Image
            source={require("../assets/images/fixit-adaptive-fg-1024.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>صلّحها</Text>
          <Text style={styles.brandNameEn}>FIX IT</Text>
          <Text style={styles.brandTag}>سوق إصلاح السيارات وقطع الغيار</Text>
          <Text style={styles.brandTagEn}>Car repair and parts marketplace</Text>
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
  // Solid green brand wrench, no circle behind it.
  logo: { width: 120, height: 120, marginBottom: 12 },
  brandName: {
    // Arabic glyphs render narrower than Latin at the same point size, so
    // bump صلّحها up to roughly match the visual width of "FIX IT" below.
    fontSize: 36,
    fontWeight: "800",
    color: theme.primary,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  brandNameEn: {
    fontSize: 31,
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
