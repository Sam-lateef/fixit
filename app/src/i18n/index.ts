import { en } from "./en.js";
import { arIq } from "./ar-iq.js";

const LOCALE_KEY = "fixit_locale";

export type LocaleId = "en" | "ar-iq";

export function getLocale(): LocaleId {
  const v = localStorage.getItem(LOCALE_KEY);
  if (v === "en" || v === "ar-iq") return v;
  return "ar-iq";
}

export function setLocale(locale: LocaleId): void {
  localStorage.setItem(LOCALE_KEY, locale);
  document.documentElement.dir = locale === "ar-iq" ? "rtl" : "ltr";
  document.documentElement.lang = locale === "ar-iq" ? "ar" : "en";
}

export function t(key: keyof typeof en): string {
  const loc = getLocale();
  if (loc === "en") return en[key];
  return arIq[key];
}

export function formatIqd(n: number): string {
  return `${n.toLocaleString("en-US")} د.ع`;
}
