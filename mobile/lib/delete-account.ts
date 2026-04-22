import { Alert } from "react-native";
import { router } from "expo-router";

import { apiFetch } from "@/lib/api";
import { wipeAllLocalStateAfterAccountDeletion } from "@/lib/account-wipe";
import type { LocaleId, StringKey } from "@/lib/strings";

const CONFIRM_SERVER = "DELETE_MY_FIXIT_ACCOUNT";

type Translate = (key: StringKey) => string;

/**
 * Shows a destructive confirmation, deletes the account on the API, wipes local state,
 * resets in-memory locale to Arabic (until the user picks again on the language gate),
 * and navigates to the language gate.
 */
export function promptDeleteAccount(
  t: Translate,
  setLocale: (loc: LocaleId) => void,
  onBusy?: (busy: boolean) => void,
): void {
  Alert.alert(t("deleteAccountConfirmTitle"), t("deleteAccountConfirmMessage"), [
    { text: t("cancel"), style: "cancel" },
    {
      text: t("deleteAccountConfirmButton"),
      style: "destructive",
      onPress: () => {
        void runDeleteAccount(t, setLocale, onBusy);
      },
    },
  ]);
}

async function runDeleteAccount(
  t: Translate,
  setLocale: (loc: LocaleId) => void,
  onBusy?: (busy: boolean) => void,
): Promise<void> {
  onBusy?.(true);
  try {
    await apiFetch<{ ok: boolean }>("/api/v1/users/me/delete-account", {
      method: "POST",
      body: JSON.stringify({ confirm: CONFIRM_SERVER }),
    });
    await wipeAllLocalStateAfterAccountDeletion();
    setLocale("ar-iq");
    router.replace("/language-gate");
  } catch (e) {
    Alert.alert(
      t("errorTitle"),
      e instanceof Error ? e.message : t("deleteAccountFailed"),
    );
  } finally {
    onBusy?.(false);
  }
}
