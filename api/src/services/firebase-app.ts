import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import admin from "firebase-admin";

let initialized = false;

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
/** Repo root: api/src/services -> ../../../ */
const REPO_ROOT = join(MODULE_DIR, "..", "..", "..");
const DEFAULT_SERVICE_ACCOUNT_FILE = join(REPO_ROOT, "firebase-service-account.json");

function loadServiceAccountJsonRaw(): string | null {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  const pathOverride = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  const filePath =
    pathOverride && pathOverride.length > 0 ? pathOverride : DEFAULT_SERVICE_ACCOUNT_FILE;
  if (!existsSync(filePath)) {
    return null;
  }
  return readFileSync(filePath, "utf8");
}

/**
 * Initializes Firebase Admin once (shared by FCM and Auth token verification).
 * Uses FIREBASE_SERVICE_ACCOUNT_JSON, else FIREBASE_SERVICE_ACCOUNT_PATH, else repo-root firebase-service-account.json.
 */
export function ensureFirebaseAdminInitialized(): boolean {
  if (initialized) {
    return true;
  }
  const raw = loadServiceAccountJsonRaw();
  if (!raw) {
    return false;
  }
  const cred = JSON.parse(raw) as admin.ServiceAccount;
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(cred) });
  }
  initialized = true;
  return true;
}

export function getFirebaseAuthOrThrow(): admin.auth.Auth {
  const ok = ensureFirebaseAdminInitialized();
  if (!ok) {
    throw new Error(
      "Firebase Admin: set FIREBASE_SERVICE_ACCOUNT_JSON, or place firebase-service-account.json at repo root, or set FIREBASE_SERVICE_ACCOUNT_PATH.",
    );
  }
  return admin.auth();
}
