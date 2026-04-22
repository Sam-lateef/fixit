/**
 * Local dev: no real phone / WhatsApp. Requires matching api/.env flags (see api/.env.example).
 */
export function isDevMockAuthUiEnabled(): boolean {
  return (
    import.meta.env.DEV && import.meta.env.VITE_DEV_MOCK_AUTH === "true"
  );
}

/** Must match api DEV_MOCK_PHONE when using mock login. */
export function devMockPhoneE164(): string {
  const v = import.meta.env.VITE_DEV_MOCK_PHONE;
  if (typeof v === "string" && v.trim().length > 0) {
    return v.trim();
  }
  return "+9647000000000";
}
