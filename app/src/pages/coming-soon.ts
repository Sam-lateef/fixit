import { LEGAL_PRIVACY_URL, LEGAL_TERMS_URL } from "../config/legal-public-urls.js";
import { resolveAdminLoginHref } from "../config/admin-login-url.js";
import { setLocale, t } from "../i18n/index.js";

export async function renderComingSoon(root: HTMLElement): Promise<void> {
  const adminUrl = escapeHtml(encodeURI(await resolveAdminLoginHref()));
  root.innerHTML =
    '<div class="screen no-nav coming-soon">' +
    '<div class="coming-soon-atmosphere" aria-hidden="true"></div>' +
    '<div class="coming-soon-inner">' +
    '<header class="coming-soon-header">' +
    '<div class="coming-soon-brand-stack">' +
    '<div class="brand-ar" dir="rtl">صلّحها</div>' +
    '<div class="brand-en">Fix It</div>' +
    "</div>" +
    '<div class="coming-soon-icon-wrap">' +
    `<img class="coming-soon-icon" src="/brand-wrench.png" width="72" height="72" alt="" />` +
    "</div>" +
    "</header>" +
    '<main class="coming-soon-main">' +
    `<h1 class="coming-soon-title">${escapeHtml(t("landingComingSoon"))}</h1>` +
    `<p class="coming-soon-line1">${escapeHtml(t("landingMarketLine"))}</p>` +
    `<p class="coming-soon-line2">${escapeHtml(t("landingConnectLine"))}</p>` +
    "</main>" +
    '<nav class="coming-soon-actions" aria-label="Sign in">' +
    `<a class="coming-soon-action" href="#/auth/shop"><span class="coming-soon-action-label">${escapeHtml(t("landingShopOwnerLogin"))}</span><span class="coming-soon-action-chevron" aria-hidden="true">›</span></a>` +
    `<a class="coming-soon-action" href="#/auth/welcome"><span class="coming-soon-action-label">${escapeHtml(t("landingCarOwnerLogin"))}</span><span class="coming-soon-action-chevron" aria-hidden="true">›</span></a>` +
    `<a class="coming-soon-action coming-soon-action-external" href="${adminUrl}" target="_blank" rel="noopener noreferrer"><span class="coming-soon-action-label">${escapeHtml(t("landingAdminLogin"))}</span><span class="coming-soon-action-chevron" aria-hidden="true">↗</span></a>` +
    "</nav>" +
    '<footer class="coming-soon-footer">' +
    '<div class="coming-soon-lang" role="group" aria-label="Language">' +
    '<button type="button" class="coming-soon-lang-btn" data-set-locale="en">English</button>' +
    '<span class="coming-soon-lang-gap" aria-hidden="true"></span>' +
    '<button type="button" class="coming-soon-lang-btn" data-set-locale="ar-iq">العربية</button>' +
    "</div>" +
    '<div class="coming-soon-legal">' +
    `<a class="coming-soon-legal-link" href="${escapeHtml(LEGAL_PRIVACY_URL)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("privacyPolicy"))}</a>` +
    '<span class="coming-soon-legal-dot" aria-hidden="true">·</span>' +
    `<a class="coming-soon-legal-link" href="${escapeHtml(LEGAL_TERMS_URL)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("termsOfService"))}</a>` +
    "</div>" +
    "</footer>" +
    "</div>" +
    "</div>";

  root.querySelectorAll("[data-set-locale]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const loc = btn.getAttribute("data-set-locale");
      if (loc === "en" || loc === "ar-iq") {
        setLocale(loc);
        void import("../router.js").then((m) => m.refreshRoute());
      }
    });
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
