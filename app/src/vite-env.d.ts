/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string | undefined;
  readonly VITE_DEV_MOCK_AUTH: string | undefined;
  readonly VITE_DEV_MOCK_PHONE: string | undefined;
  /** Optional bake-time admin login URL; prod default is API `ADMIN_LOGIN_URL` via /api/v1/public/config. */
  readonly VITE_ADMIN_LOGIN_URL: string | undefined;
  readonly VITE_FIREBASE_API_KEY: string | undefined;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string | undefined;
  readonly VITE_FIREBASE_PROJECT_ID: string | undefined;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string | undefined;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string | undefined;
  readonly VITE_FIREBASE_APP_ID: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
