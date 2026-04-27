import { arIq } from "../i18n/ar-iq.js";
import { en } from "../i18n/en.js";
import { getLocale, t } from "../i18n/index.js";
import { navigate } from "../router.js";

type StubKey = "privacyStub" | "termsStub";

export function renderPrivacy(root: HTMLElement): void {
  renderLegalPage(root, t("privacyPolicy"), "privacyStub");
}

export function renderTerms(root: HTMLElement): void {
  renderLegalPage(root, t("termsOfService"), "termsStub");
}

function renderLegalPage(root: HTMLElement, title: string, stubKey: StubKey): void {
  const loc = getLocale();
  const primary = loc === "en" ? en[stubKey] : arIq[stubKey];
  const secondary = loc === "en" ? arIq[stubKey] : en[stubKey];
  const secondaryHeading = loc === "en" ? "العربية" : "English";
  const secondaryLang = loc === "en" ? "ar" : "en";

  const primaryParas = primary
    .split("\n\n")
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
  const secondaryParas = secondary
    .split("\n\n")
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");

  const safeTitle = escapeHtml(title);
  root.innerHTML =
    '<div class="screen no-nav legal-page">' +
    `<h1 class="title legal-title">${safeTitle}</h1>` +
    `<div class="legal-body legal-primary">${primaryParas}</div>` +
    `<h2 class="legal-bilingual-h">${escapeHtml(secondaryHeading)}</h2>` +
    `<div class="legal-body legal-secondary" lang="${secondaryLang}">${secondaryParas}</div>` +
    `<button type="button" class="btn btn-secondary legal-back">${escapeHtml(t("backToHome"))}</button>` +
    "</div>";

  root.querySelector(".legal-back")?.addEventListener("click", () => {
    navigate("#/coming-soon");
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
