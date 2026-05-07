import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiFetch } from "./api";
import { getToken } from "./auth-storage";
import { FIXIT_LOCALE_STORAGE_KEY } from "./locale-storage";
import type { LocaleId } from "./strings";

/**
 * Persists the viewer's app language on the server so push notifications use the same locale.
 */
export async function syncPreferredLocaleToServer(loc: LocaleId): Promise<void> {
  const token = await getToken();
  if (!token) {
    return;
  }
  try {
    await apiFetch("/api/v1/users/me", {
      method: "PUT",
      body: JSON.stringify({ preferredLocale: loc }),
    });
  } catch {
    /* offline or transient errors */
  }
}

/**
 * After login / cold start, align server `preferredLocale` with AsyncStorage.
 */
export async function syncStoredLocaleToServer(): Promise<void> {
  const token = await getToken();
  if (!token) {
    return;
  }
  const stored = await AsyncStorage.getItem(FIXIT_LOCALE_STORAGE_KEY);
  if (stored !== "en" && stored !== "ar-iq") {
    return;
  }
  await syncPreferredLocaleToServer(stored);
}
