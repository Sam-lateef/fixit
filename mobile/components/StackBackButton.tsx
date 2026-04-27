import type { ReactElement } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { useI18n } from "@/lib/i18n";

/**
 * Custom Stack back button that always renders `‹ Back` (chevron-left + label)
 * in LTR order, even when I18nManager.isRTL is true. iOS native back button
 * mirrors under RTL (renders `Back ›`), which looks wrong in our headers.
 */
export function StackBackButton(): ReactElement {
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("back")}
      hitSlop={12}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        }
      }}
      style={styles.btn}
    >
      <Text style={styles.text} allowFontScaling={false}>
        ‹ {t("back")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 8, paddingHorizontal: 4, marginLeft: 4 },
  text: { fontSize: 17, color: "#fff", fontWeight: "600" },
});
