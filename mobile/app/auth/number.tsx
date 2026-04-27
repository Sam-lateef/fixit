import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { apiFetch } from "@/lib/api";
import { friendlyApiError } from "@/lib/api-error";
import { devMockPhoneE164, isDevMockAuthUiEnabled } from "@/lib/dev-auth";
import { useI18n } from "@/lib/i18n";
import { theme } from "@/lib/theme";
const PREFIX = "+964";

export default function AuthNumberScreen(): React.ReactElement {
  const { t } = useI18n();
  const [suffix, setSuffix] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendOtp(full: string): Promise<void> {
    setErr("");
    setBusy(true);
    try {
      await apiFetch<{ success: boolean }>("/api/v1/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone: full }),
        skipAuth: true,
      });
      router.push({ pathname: "/auth/otp", params: { phone: full } });
    } catch (e) {
      setErr(friendlyApiError(e, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      {isDevMockAuthUiEnabled() ? (
        <View style={styles.devBox}>
          <Text style={styles.devHint}>{t("devOnlyNoSms")}</Text>
          <Pressable
            style={styles.btnSecondary}
            onPress={() => void sendOtp(devMockPhoneE164())}
          >
            <Text style={styles.btnSecondaryText}>{t("devMockContinue")}</Text>
          </Pressable>
          <Pressable
            style={[styles.btnSecondary, styles.btnSecondaryMargin]}
            onPress={() => {
              router.push({
                pathname: "/auth/otp",
                params: { phone: devMockPhoneE164() },
              });
            }}
          >
            <Text style={styles.btnSecondaryText}>{t("devBypassSkipSend")}</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.row}>
        <Text style={styles.prefix}>{PREFIX}</Text>
        <TextInput
          style={styles.input}
          keyboardType="phone-pad"
          placeholder="7xx xxx xxxx"
          placeholderTextColor={theme.mutedLight}
          maxLength={15}
          value={suffix}
          onChangeText={setSuffix}
        />
      </View>
      <Pressable
        style={[styles.btn, busy && styles.btnDisabled]}
        disabled={busy}
        onPress={() => {
          const digits = suffix.replace(/\D/g, "");
          const full = `${PREFIX}${digits}`;
          if (!/^\+9647\d{9}$/.test(full)) {
            setErr("Use +9647XXXXXXXXX (Iraqi mobile)");
            return;
          }
          void sendOtp(full);
        }}
      >
        <Text style={styles.btnText}>{t("sendCode")}</Text>
      </Pressable>
      {err ? <Text style={styles.err}>{err}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, backgroundColor: theme.surface },
  devBox: {
    marginBottom: 16,
    padding: 12,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.towingBg,
    borderWidth: 1,
    borderColor: theme.towingText,
  },
  devHint: { fontSize: 12, color: theme.muted, marginBottom: 8 },
  btnSecondary: {
    paddingVertical: 12,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.surface,
    alignItems: "center",
  },
  btnSecondaryText: { color: theme.towingText, fontWeight: "600" },
  btnSecondaryMargin: { marginTop: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  prefix: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: theme.chip,
    borderRadius: theme.radiusMd,
    overflow: "hidden",
    fontWeight: "600",
    color: theme.text,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.text,
    textAlign: "left",
  },
  btn: {
    marginTop: 20,
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  err: { marginTop: 12, color: theme.danger, fontSize: 13 },
});
