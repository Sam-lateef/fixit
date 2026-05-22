import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let appInstance: FirebaseApp | undefined;
let authInstance: Auth | undefined;

function missingFirebaseEnvKeys(): string[] {
  const entries = Object.entries(firebaseConfig) as [string, string | undefined][];
  return entries.filter(([, v]) => !v || v.length === 0).map(([k]) => k);
}

/**
 * Firebase client app (same project as FIREBASE_SERVICE_ACCOUNT_JSON on the API).
 */
export function getFirebaseApp(): FirebaseApp {
  if (appInstance) {
    return appInstance;
  }
  const missing = missingFirebaseEnvKeys();
  if (missing.length > 0) {
    throw new Error(
      `Missing EXPO_PUBLIC Firebase config: ${missing.join(", ")}. Copy mobile/.env.example.`,
    );
  }
  appInstance =
    getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return appInstance;
}

/**
 * Firebase Auth for React Native (default persistence).
 */
export function getFirebaseAuth(): Auth {
  if (authInstance) {
    return authInstance;
  }
  const app = getFirebaseApp();
  authInstance = getAuth(app);
  return authInstance;
}

export function isFirebaseClientConfigured(): boolean {
  return missingFirebaseEnvKeys().length === 0;
}

/** Why native Google is disabled at build time (empty `EXPO_PUBLIC_*` on EAS without eas.json env). */
export function getGoogleSignInSetupIssue(): "firebase" | "webClient" | null {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "";
  if (webClientId.length === 0) {
    return "webClient";
  }
  if (missingFirebaseEnvKeys().length > 0) {
    return "firebase";
  }
  return null;
}
