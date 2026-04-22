import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCALE_GATE_KEY = "fixit_locale_gate_done";

/**
 * First-run language picker (before auth). Logged-in users skip via migration in `index`.
 */
export async function hasCompletedLocaleGate(): Promise<boolean> {
  const v = await AsyncStorage.getItem(LOCALE_GATE_KEY);
  return v === "1";
}

export async function setLocaleGateCompleted(): Promise<void> {
  await AsyncStorage.setItem(LOCALE_GATE_KEY, "1");
}

/** Clears first-run language flag so the next launch shows the language gate again. */
export async function clearLocaleGateFlag(): Promise<void> {
  await AsyncStorage.removeItem(LOCALE_GATE_KEY);
}
