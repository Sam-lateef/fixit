import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

function envTrim(v: string | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

export function isFirebaseWebConfigured(): boolean {
  const e = import.meta.env;
  return Boolean(
    envTrim(e.VITE_FIREBASE_API_KEY) &&
      envTrim(e.VITE_FIREBASE_AUTH_DOMAIN) &&
      envTrim(e.VITE_FIREBASE_PROJECT_ID) &&
      envTrim(e.VITE_FIREBASE_APP_ID),
  );
}

/**
 * Firebase client for the Vite web shell (Google / Apple → same `/api/v1/auth/firebase` as mobile).
 */
export function getFirebaseAuthWeb(): Auth {
  if (!isFirebaseWebConfigured()) {
    throw new Error("Firebase web env is not configured (VITE_FIREBASE_*).");
  }
  if (!app) {
    const e = import.meta.env;
    app = initializeApp({
      apiKey: envTrim(e.VITE_FIREBASE_API_KEY),
      authDomain: envTrim(e.VITE_FIREBASE_AUTH_DOMAIN),
      projectId: envTrim(e.VITE_FIREBASE_PROJECT_ID),
      storageBucket: envTrim(e.VITE_FIREBASE_STORAGE_BUCKET),
      messagingSenderId: envTrim(e.VITE_FIREBASE_MESSAGING_SENDER_ID),
      appId: envTrim(e.VITE_FIREBASE_APP_ID),
    });
  }
  if (!auth) {
    auth = getAuth(app);
  }
  return auth;
}
