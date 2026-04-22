/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string | undefined;
  readonly VITE_DEV_MOCK_AUTH: string | undefined;
  readonly VITE_DEV_MOCK_PHONE: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
