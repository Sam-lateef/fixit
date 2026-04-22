import { Pressable, StyleSheet, Text } from "react-native";

import { getGoogleIdTokenFromNativeSignIn } from "@/lib/google-signin-native";
import { isFirebaseClientConfigured } from "@/lib/firebase";
import type { BackendAuthResponse } from "@/lib/social-auth";
import { signInWithGoogleIdToken } from "@/lib/social-auth";
import { theme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

type GoogleNativeSignInButtonProps = {
  webClientId: string;
  onSignedIn: (res: BackendAuthResponse) => void;
  onError: (message: string) => void;
  busy: boolean;
  setBusy: (value: boolean) => void;
};

/**
 * Native `@react-native-google-signin/google-signin` — **development and release builds** (not Expo Go).
 */
export function GoogleNativeSignInButton(props: GoogleNativeSignInButtonProps): React.ReactElement {
  const { t } = useI18n();
  const { webClientId, onSignedIn, onError, busy, setBusy } = props;
  const googleReady = webClientId.length > 0 && isFirebaseClientConfigured();

  async function onPress(): Promise<void> {
    onError("");
    setBusy(true);
    try {
      const idToken = await getGoogleIdTokenFromNativeSignIn();
      const res = await signInWithGoogleIdToken(idToken);
      onSignedIn(res);
    } catch (e) {
      const code =
        e !== null && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
      const msg = e instanceof Error ? e.message : "";
      if (msg === "SIGN_IN_CANCELLED" || code.includes("CANCEL")) {
        return;
      }
      onError(msg.length > 0 ? msg : t("authSignInFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      style={[styles.btn, styles.btnPrimary, (!googleReady || busy) && styles.btnDisabled]}
      disabled={!googleReady || busy}
      onPress={() => {
        void onPress();
      }}
    >
      <Text style={styles.btnPrimaryText}>{t("continueWithGoogle")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: "center",
    marginBottom: 12,
  },
  btnPrimary: { backgroundColor: theme.primaryMid },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnDisabled: { opacity: 0.5 },
});
