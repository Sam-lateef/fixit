import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

type BrandedSplashProps = {
  showSpinner?: boolean;
};

/** Matches native splash + product mock (green field, white logo tile, app name). */
export function BrandedSplash({ showSpinner = true }: BrandedSplashProps): React.ReactElement {
  const { t } = useI18n();

  return (
    <View style={styles.wrap}>
      <View style={styles.logoTile}>
        <Image
          source={require("@/assets/images/launcher-wrench-green.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>{t("appName")}</Text>
      <Text style={styles.tag}>{t("tagline")}</Text>
      {showSpinner ? (
        <ActivityIndicator color="#ffffff" style={styles.spin} size="large" />
      ) : null}
    </View>
  );
}

const LOGO_TILE = 72;

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.primary,
    padding: 24,
  },
  logoTile: {
    width: LOGO_TILE,
    height: LOGO_TILE,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logo: {
    width: LOGO_TILE * 0.55,
    height: LOGO_TILE * 0.55,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#ffffff",
    marginTop: 4,
    textAlign: "center",
  },
  tag: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.65)",
    marginTop: 6,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18,
  },
  spin: { marginTop: 28 },
});
