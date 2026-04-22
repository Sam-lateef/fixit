import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { Platform } from "react-native";

import { apiFetch } from "./api";
import { getFirebaseAuth } from "./firebase";

export type BackendAuthResponse = {
  token: string;
  isNewUser: boolean;
  user: {
    id: string;
    userType: "OWNER" | "SHOP";
    phone: string | null;
    email: string | null;
  };
};

/**
 * Signs into Firebase with Google's ID token, then exchanges Firebase ID token for API JWT.
 */
export async function signInWithGoogleIdToken(googleIdToken: string): Promise<BackendAuthResponse> {
  const auth = getFirebaseAuth();
  const credential = GoogleAuthProvider.credential(googleIdToken);
  await signInWithCredential(auth, credential);
  return exchangeFirebaseSessionForBackendJwt();
}

/**
 * Apple Sign-In (iOS) → Firebase → API JWT. Requires hashed nonce + raw nonce for Firebase.
 */
export async function signInWithAppleNative(): Promise<BackendAuthResponse> {
  if (Platform.OS !== "ios") {
    throw new Error("Apple Sign-In is only available on iOS");
  }
  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    throw new Error("Apple Sign-In is not available on this device");
  }
  const rawNonce = await randomNonceString(32);
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  const apple = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });
  if (!apple.identityToken) {
    throw new Error("Apple did not return an identity token");
  }
  const provider = new OAuthProvider("apple.com");
  const oauthCred = provider.credential({
    idToken: apple.identityToken,
    rawNonce,
  });
  const auth = getFirebaseAuth();
  await signInWithCredential(auth, oauthCred);
  return exchangeFirebaseSessionForBackendJwt();
}

async function randomNonceString(length: number): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(length);
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

async function exchangeFirebaseSessionForBackendJwt(): Promise<BackendAuthResponse> {
  const auth = getFirebaseAuth();
  const u = auth.currentUser;
  if (!u) {
    throw new Error("Firebase sign-in did not produce a user session");
  }
  const idToken = await u.getIdToken();
  return apiFetch<BackendAuthResponse>("/api/v1/auth/firebase", {
    method: "POST",
    body: JSON.stringify({ idToken }),
    skipAuth: true,
  });
}
