import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { submitReport } from "@/lib/report-content";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";

type ReportTargetType = "POST" | "MESSAGE" | "USER";

function isReportTargetType(value: string): value is ReportTargetType {
  return value === "POST" || value === "MESSAGE" || value === "USER";
}

export default function ReportScreen(): React.ReactElement {
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ targetType?: string; targetId?: string }>();
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const targetType = useMemo(() => {
    if (typeof params.targetType !== "string") return null;
    return isReportTargetType(params.targetType) ? params.targetType : null;
  }, [params.targetType]);
  const targetId = typeof params.targetId === "string" ? params.targetId.trim() : "";

  // Side-effects belong in effects, not in render. If we arrive without the
  // required params, schedule a back-nav and render a placeholder this tick.
  useEffect(() => {
    if (!targetType || targetId.length === 0) {
      router.back();
    }
  }, [targetType, targetId]);

  if (!targetType || targetId.length === 0) {
    return <View style={styles.screen} />;
  }

  const title =
    targetType === "POST"
      ? t("reportPost")
      : targetType === "MESSAGE"
        ? t("reportMessage")
        : t("reportUser");

  const save = (): void => {
    const trimmed = details.trim();
    if (trimmed.length === 0) {
      setError(t("reportDetailsRequired"));
      return;
    }
    setBusy(true);
    setError("");
    void (async () => {
      try {
        await submitReport(targetType, targetId, trimmed);
        Alert.alert(t("reportSent"));
        router.back();
      } catch (e) {
        const msg = e instanceof Error ? e.message : t("updateFailed");
        setError(msg);
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.screen,
        {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 12,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
      // react-native-keyboard-controller's KAV — works under Android
      // edge-to-edge where RN's stock KAV is a no-op. Bottom padding
      // grows to match the keyboard height so the Cancel/Report row
      // (anchored at the bottom of the textarea container) stays
      // visible above the IME.
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{t("reportDetailsHint")}</Text>
        <TextInput
          value={details}
          onChangeText={(next) => {
            setDetails(next);
            if (error.length > 0) setError("");
          }}
          placeholder={t("reportDetailsPlaceholder")}
          placeholderTextColor={theme.mutedLight}
          multiline
          maxLength={2000}
          style={[
            styles.input,
            locale === "ar-iq"
              ? { textAlign: "right", writingDirection: "rtl" }
              : { textAlign: "left", writingDirection: "ltr" },
          ]}
        />
        {error.length > 0 ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelText}>{t("cancel")}</Text>
          </Pressable>
          <Pressable
            style={[styles.submitBtn, busy && styles.submitBtnDisabled]}
            onPress={save}
            disabled={busy}
          >
            <Text style={styles.submitText}>{t("report")}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "700", color: theme.text },
  subtitle: { fontSize: 14, color: theme.muted },
  input: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.surface,
    color: theme.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
  },
  error: { color: theme.danger, fontSize: 13, fontWeight: "600" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.surface,
  },
  cancelText: { color: theme.text, fontWeight: "600" },
  submitBtn: {
    borderRadius: theme.radiusMd,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.danger,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontWeight: "700" },
});
