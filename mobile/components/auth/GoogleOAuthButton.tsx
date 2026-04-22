import { ResponseType } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { useEffect, useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";

import { getGoogleOAuthRedirectUri, isExpoGoMissingGoogleProxyRedirect, shouldUseNativeGoogleSignIn } from "@/lib/google-oauth-redirect";
import { isFirebaseClientConfigured } from "@/lib/firebase";
import type { BackendAuthResponse } from "@/lib/social-auth";
import { signInWithGoogleIdToken } from "@/lib/social-auth";
import { theme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

type GoogleOAuthButtonProps = {
  webClientId: string;
  iosClientId: string | undefined;
  androidClientId: string | undefined;
  onSignedIn: (res: BackendAuthResponse) => void;
  onError: (message: string) => void;
  busy: boolean;
  setBusy: (value: boolean) => void;
};

/**
 * Google via `expo-auth-session` — **Expo Go** (auth.expo.io proxy) and **web**.
 */
export function GoogleOAuthButton(props: GoogleOAuthButtonProps): React.ReactElement {
  const { t } = useI18n();
  const { webClientId, iosClientId, androidClientId, onSignedIn, onError, busy, setBusy } = props;

  const googleOAuthProxyRedirect = getGoogleOAuthRedirectUri();

  const googleAuthConfig = useMemo(() => {
    const useExpoProxy =
      typeof googleOAuthProxyRedirect === "string" && googleOAuthProxyRedirect.length > 0;
    const base: {
      webClientId: string;
      clientId?: string;
      iosClientId?: string;
      androidClientId?: string;
      redirectUri?: string;
      responseType?: ResponseType;
    } = {
      webClientId,
      iosClientId:
        useExpoProxy || !iosClientId || iosClientId.length === 0 ? undefined : iosClientId,
      androidClientId:
        useExpoProxy || !androidClientId || androidClientId.length === 0
          ? undefined
          : androidClientId,
    };
    if (useExpoProxy) {
      base.redirectUri = googleOAuthProxyRedirect;
      base.clientId = webClientId;
      base.responseType = ResponseType.IdToken;
    } else if (Platform.OS === "web") {
      base.responseType = ResponseType.IdToken;
    }
    return base;
  }, [webClientId, iosClientId, androidClientId, googleOAuthProxyRedirect]);

  const [request, response, promptAsync] = Google.useAuthRequest(googleAuthConfig);

  // Never allow the web OAuth flow on native (dev/release) builds — those must use
  // GoogleNativeSignInButton.  Using the AndroidClientId in a web OAuth request
  // triggers Google's "custom URI scheme is enabled for android client" error.
  const isNativeBuild = shouldUseNativeGoogleSignIn();
  const googleReady =
    !isNativeBuild &&
    Boolean(request) &&
    webClientId.length > 0 &&
    isFirebaseClientConfigured() &&
    !isExpoGoMissingGoogleProxyRedirect();

  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params.id_token;
      if (typeof idToken !== "string" || idToken.length === 0) {
        onError(t("authSignInFailed"));
        return;
      }
      setBusy(true);
      onError("");
      void (async () => {
        try {
          const res = await signInWithGoogleIdToken(idToken);
          onSignedIn(res);
        } catch (e) {
          onError(e instanceof Error ? e.message : t("authSignInFailed"));
        } finally {
          setBusy(false);
        }
      })();
    } else if (response?.type === "error") {
      const msg = response.error?.message ?? response.params?.error ?? t("authSignInFailed");
      onError(String(msg));
    }
  }, [response, onError, onSignedIn, setBusy, t]);

  return (
    <>
      <Pressable
        style={[styles.btn, styles.btnPrimary, (!googleReady || busy) && styles.btnDisabled]}
        disabled={!googleReady || busy}
        onPress={() => {
          onError("");
          void promptAsync();
        }}
      >
        <Text style={styles.btnPrimaryText}>{t("continueWithGoogle")}</Text>
      </Pressable>
    </>
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
