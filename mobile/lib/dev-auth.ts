/**
 * Dev builds: show mock phone + bypass shortcuts on the first auth screen.
 * Opt out with EXPO_PUBLIC_DEV_MOCK_AUTH=false (never shown when __DEV__ is false).
 */
export function isDevMockAuthUiEnabled(): boolean {
  if (!__DEV__) {
    return false;
  }
  const flag = process.env.EXPO_PUBLIC_DEV_MOCK_AUTH?.trim().toLowerCase();
  if (flag === "false" || flag === "0") {
    return false;
  }
  return true;
}

export function devMockPhoneE164(): string {
  const v = process.env.EXPO_PUBLIC_DEV_MOCK_PHONE?.trim();
  if (v && v.length > 0) {
    return v;
  }
  return "+9647000000000";
}
