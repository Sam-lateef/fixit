import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DevSettings, I18nManager } from "react-native";

import { arIq, en, LocaleId, StringKey } from "./strings";

export const FIXIT_LOCALE_STORAGE_KEY = "fixit_locale";

const LOCALE_KEY = FIXIT_LOCALE_STORAGE_KEY;

type I18nContextValue = {
  locale: LocaleId;
  setLocale: (loc: LocaleId) => void;
  t: (key: StringKey) => string;
  isRtl: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [locale, setLocaleState] = useState<LocaleId>("ar-iq");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void (async () => {
      const stored = await AsyncStorage.getItem(LOCALE_KEY);
      if (stored === "en" || stored === "ar-iq") {
        setLocaleState(stored);
      }
      setHydrated(true);
    })();
  }, []);

  /** Flip native layout direction (flexDirection, writing direction on un-styled Text, etc.).
   *  forceRTL persists to native I18nManager but the live RN root doesn't re-apply it until
   *  the bridge reloads — in dev we use DevSettings.reload(), in production Updates.reloadAsync()
   *  (Updates throws in dev because expo-updates isn't configured for dev builds).
   *  Wait for AsyncStorage to hydrate first — otherwise the default "ar-iq" can trigger
   *  forceRTL before the stored "en" loads, causing a reload ping-pong loop. */
  useEffect(() => {
    if (!hydrated) return;
    const rtl = locale === "ar-iq";
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
      if (__DEV__) {
        DevSettings.reload();
      } else {
        void Updates.reloadAsync();
      }
    }
  }, [locale, hydrated]);

  const setLocale = useCallback((loc: LocaleId) => {
    setLocaleState(loc);
    void AsyncStorage.setItem(LOCALE_KEY, loc);
  }, []);

  const t = useCallback(
    (key: StringKey): string => {
      return locale === "en" ? en[key] : arIq[key];
    },
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      isRtl: locale === "ar-iq",
    }),
    [locale, setLocale, t],
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

/** Removes saved language so the next cold start uses provider default until the user picks again. */
export async function clearStoredLocalePreference(): Promise<void> {
  await AsyncStorage.removeItem(FIXIT_LOCALE_STORAGE_KEY);
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
