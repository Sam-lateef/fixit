import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

export default function NotFoundScreen(): React.ReactElement {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t("notFoundTitle") }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t("notFoundBody")}</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t("goHome")}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: theme.bg,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    color: theme.text,
  },
  link: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: theme.primaryMid,
    borderRadius: theme.radiusMd,
  },
  linkText: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "700",
  },
});
