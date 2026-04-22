import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { apiFetch } from "@/lib/api";
import { hrefAuthWelcome } from "@/lib/routes-href";
import { navigateAfterLogin } from "@/lib/auth-routing";
import { setToken } from "@/lib/auth-storage";
import { useI18n } from "@/lib/i18n";
import { registerPushToken } from "@/lib/push-notifications";
import { syncRevenueCatUser } from "@/lib/revenuecat";
import { theme } from "@/lib/theme";

const CODE_LEN = 6;

export default function AuthOtpScreen(): React.ReactElement {
  const { t } = useI18n();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LEN).fill(""));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendSec, setResendSec] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (resendSec <= 0) return;
    const id = setTimeout(() => setResendSec((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendSec]);

  if (!phone) {
    router.replace(hrefAuthWelcome);
    return <View style={styles.screen} />;
  }

  const complete = digits.every((d) => d !== "");

  const doVerify = async (code: string): Promise<void> => {
    setErr("");
    setBusy(true);
    try {
      const res = await apiFetch<{
        token: string;
        isNewUser: boolean;
        user: { id: string; userType: "OWNER" | "SHOP" };
      }>("/api/v1/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone, code }),
        skipAuth: true,
      });
      await setToken(res.token);
      await syncRevenueCatUser({ id: res.user.id, userType: res.user.userType });
      void registerPushToken(); // fire-and-forget — don't block login
      navigateAfterLogin({
        isNewUser: res.isNewUser,
        user: { userType: res.user.userType },
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDigit = (index: number, value: string): void => {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < CODE_LEN - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (digit && index === CODE_LEN - 1 && next.every((d) => d !== "")) {
      void doVerify(next.join(""));
    }
  };

  const handleKeyPress = (index: number, key: string): void => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = (): void => {
    void (async () => {
      try {
        await apiFetch("/api/v1/auth/send-otp", {
          method: "POST",
          body: JSON.stringify({ phone }),
          skipAuth: true,
        });
        setResendSec(60);
        setDigits(Array(CODE_LEN).fill(""));
        setErr("");
        inputRefs.current[0]?.focus();
      } catch {
        /* silent — user can try again */
      }
    })();
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.h1}>{t("enterCode")}</Text>
      <Text style={styles.sub}>{phone}</Text>

      <View style={styles.codeRow}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(r) => {
              inputRefs.current[i] = r;
            }}
            style={[styles.digitBox, d ? styles.digitBoxFilled : null]}
            value={d}
            onChangeText={(v) => handleDigit(i, v)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            caretHidden
            textAlign="center"
          />
        ))}
      </View>

      <View style={styles.resendRow}>
        {resendSec > 0 ? (
          <Text style={styles.resendTimer}>
            {t("resendIn")} 0:{String(resendSec).padStart(2, "0")}
          </Text>
        ) : (
          <Pressable onPress={handleResend} hitSlop={8}>
            <Text style={styles.resendLink}>{t("resend")}</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        style={[styles.btn, (!complete || busy) && styles.btnDisabled]}
        disabled={!complete || busy}
        onPress={() => void doVerify(digits.join(""))}
      >
        <Text style={styles.btnText}>{t("verify")}</Text>
      </Pressable>

      {err ? <Text style={styles.err}>{err}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, backgroundColor: theme.surface },
  h1: { fontSize: 22, fontWeight: "700", color: theme.text },
  sub: {
    marginTop: 8,
    color: theme.muted,
    fontSize: 14,
    writingDirection: "ltr",
  },
  codeRow: {
    flexDirection: "row",
    gap: 8,
    direction: "ltr",
    marginTop: 20,
  },
  digitBox: {
    flex: 1,
    height: 52,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.chip,
    fontSize: 22,
    fontWeight: "700",
    color: theme.text,
  },
  digitBoxFilled: {
    backgroundColor: theme.primaryLight,
    borderColor: theme.primaryMid,
    color: theme.primary,
  },
  resendRow: { marginTop: 12, minHeight: 22 },
  resendTimer: { fontSize: 13, color: theme.mutedLight },
  resendLink: { fontSize: 13, color: theme.primaryMid, fontWeight: "600" },
  btn: {
    marginTop: 24,
    backgroundColor: theme.primaryMid,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  err: { marginTop: 12, color: theme.danger, fontSize: 13 },
});
