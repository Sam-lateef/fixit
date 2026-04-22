import { clearLocaleGateFlag } from "@/lib/locale-gate";
import { clearStoredLocalePreference } from "@/lib/i18n";
import { signOutFromApp } from "@/lib/sign-out";

/**
 * After the server deletes the user, clears JWT, Firebase/Google sessions, RevenueCat,
 * language gate, and saved locale so the next launch matches a new install.
 */
export async function wipeAllLocalStateAfterAccountDeletion(): Promise<void> {
  await signOutFromApp();
  await clearLocaleGateFlag();
  await clearStoredLocalePreference();
}
