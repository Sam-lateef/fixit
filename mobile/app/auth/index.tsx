import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GoogleNativeSignInButton } from "@/components/auth/GoogleNativeSignInButton";
import { GoogleOAuthButton } from "@/components/auth/GoogleOAuthButton";
import { navigateAfterLogin } from "@/lib/auth-routing";
import { setToken } from "@/lib/auth-storage";
import { isFirebaseClientConfigured } from "@/lib/firebase";
import { shouldUseNativeGoogleSignIn } from "@/lib/google-oauth-redirect";
import { useI18n } from "@/lib/i18n";
import { registerPushToken } from "@/lib/push-notifications";
import type { BackendAuthResponse } from "@/lib/social-auth";
import { signInWithAppleNative } from "@/lib/social-auth";
import { theme } from "@/lib/theme";

WebBrowser.maybeCompleteAuthSession();

export default function AuthWelcomeScreen(): React.ReactElement {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "";
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim();

  const nativeEligible = shouldUseNativeGoogleSignIn();

  // For native Android builds we must confirm Play Services before deciding which
  // Google button to show.  Start as "unchecked" so neither button is rendered
  // until we know — avoids briefly showing GoogleOAuthButton (which uses the
  // Android OAuth client ID) and triggering Google's "custom URI scheme" error
  // if the user taps quickly.
  const needsPlayServicesCheck = nativeEligible && Platform.OS === "android";
  const [androidPlayServicesChecked, setAndroidPlayServicesChecked] = useState(
    () => !needsPlayServicesCheck,
  );
  const [androidPlayServicesOk, setAndroidPlayServicesOk] = useState(
    () => !needsPlayServicesCheck,
  );

  useEffect(() => {
    if (!needsPlayServicesCheck) {
      return;
    }
    void (async () => {
      const { isAndroidGooglePlayServicesAvailable } = await import("@/lib/google-play-services");
      const ok = await isAndroidGooglePlayServicesAvailable();
      setAndroidPlayServicesOk(ok);
      setAndroidPlayServicesChecked(true);
    })();
  }, [needsPlayServicesCheck]);

  // Show native sign-in when eligible AND (not Android OR Play Services confirmed OK).
  // While the Play Services check is pending (`!androidPlayServicesChecked`), neither
  // button is rendered — the existing spinner covers that state.
  const useNativeGoogle =
    nativeEligible && (!needsPlayServicesCheck || (androidPlayServicesChecked && androidPlayServicesOk));

  function handleGoogleSignedIn(res: BackendAuthResponse): void {
    void (async () => {
      await setToken(res.token);
      void registerPushToken(); // fire-and-forget — don't block login
      navigateAfterLogin(res);
    })();
  }

  async function onApple(): Promise<void> {
    setErr("");
    setBusy(true);
    try {
      const res = await signInWithAppleNative();
      await setToken(res.token);
      void registerPushToken(); // fire-and-forget — don't block login
      navigateAfterLogin(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("authSignInFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      {/* Brand */}
      <View style={styles.brandWrap}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>🔧</Text>
        </View>
        <Text style={styles.brandName}>{t("appName")}</Text>
        <Text style={styles.brandTag}>{t("tagline")}</Text>
      </View>

      {busy ? (
        <ActivityIndicator color={theme.primaryMid} style={styles.spin} size="large" />
      ) : null}

      {needsPlayServicesCheck && !androidPlayServicesChecked ? null : useNativeGoogle ? (
        <GoogleNativeSignInButton
          webClientId={webClientId}
          onSignedIn={handleGoogleSignedIn}
          onError={setErr}
          busy={busy}
          setBusy={setBusy}
        />
      ) : (
        <GoogleOAuthButton
          webClientId={webClientId}
          iosClientId={iosClientId}
          androidClientId={androidClientId}
          onSignedIn={handleGoogleSignedIn}
          onError={setErr}
          busy={busy}
          setBusy={setBusy}
        />
      )}

      {Platform.OS === "ios" ? (
        <Pressable
          style={[styles.btn, styles.btnPrimary, busy && styles.btnDisabled]}
          disabled={busy || !isFirebaseClientConfigured()}
          onPress={() => void onApple()}
        >
          <Text style={styles.btnPrimaryText}>{t("continueWithApple")}</Text>
        </Pressable>
      ) : null}

      <Pressable
        style={[styles.btn, styles.btnSecondary, busy && styles.btnDisabled]}
        disabled={busy}
        onPress={() => router.push("/auth/number")}
      >
        <Text style={styles.btnSecondaryText}>{t("usePhoneInstead")}</Text>
      </Pressable>

      {err ? <Text style={styles.err}>{err}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: theme.surface,
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
  brandName: { fontSize: 26, fontWeight: "800", color: theme.primary, letterSpacing: 0.5 },
  brandTag: { fontSize: 13, color: theme.muted, marginTop: 4, textAlign: "center" },
  spin: { marginBottom: 16 },
  btn: {
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
    marginBottom: 12,
  },
  btnPrimary: { backgroundColor: theme.primaryMid },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnSecondary: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  btnSecondaryText: { color: theme.text, fontWeight: "600", fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
  err: { marginTop: 16, color: theme.danger, fontSize: 14 },
});
