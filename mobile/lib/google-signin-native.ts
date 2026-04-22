let configurePromise: Promise<void> | null = null;

/**
 * Configures Google Sign-In once. Uses the Web client ID so Firebase receives a valid `id_token`.
 * iOS: set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` if you do not use `GoogleService-Info.plist` OAuth wiring.
 */
async function ensureConfigured(): Promise<void> {
  if (configurePromise !== null) {
    return configurePromise;
  }
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "";
  if (webClientId.length === 0) {
    throw new Error("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set");
  }
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

  configurePromise = (async () => {
    const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
    GoogleSignin.configure({
      webClientId,
      offlineAccess: false,
      scopes: ["openid", "profile", "email"],
      ...(typeof iosClientId === "string" && iosClientId.length > 0 ? { iosClientId } : {}),
    });
  })();

  return configurePromise;
}

/**
 * Presents the native Google sign-in UI and returns an OpenID Connect ID token for Firebase.
 *
 * @throws If sign-in is cancelled or no `id_token` is returned.
 */
export async function getGoogleIdTokenFromNativeSignIn(): Promise<string> {
  await ensureConfigured();
  const { GoogleSignin, statusCodes } = await import("@react-native-google-signin/google-signin");

  try {
    const result = await GoogleSignin.signIn();
    if (result.type === "cancelled") {
      const err = new Error("SIGN_IN_CANCELLED");
      (err as Error & { code?: string }).code = statusCodes.SIGN_IN_CANCELLED;
      throw err;
    }
    const idToken = result.data.idToken;
    if (typeof idToken !== "string" || idToken.length === 0) {
      throw new Error(
        "Google Sign-In did not return an id token. Confirm Web client ID and iOS/Android OAuth clients in Google Cloud.",
      );
    }
    return idToken;
  } catch (e: unknown) {
    const code =
      e !== null && typeof e === "object" && "code" in e && typeof (e as { code: unknown }).code === "string"
        ? (e as { code: string }).code
        : undefined;
    if (code === statusCodes.SIGN_IN_CANCELLED) {
      const err = new Error("SIGN_IN_CANCELLED");
      (err as Error & { code?: string }).code = statusCodes.SIGN_IN_CANCELLED;
      throw err;
    }
    throw e;
  }
}
