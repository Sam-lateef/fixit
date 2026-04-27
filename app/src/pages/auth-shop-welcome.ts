import { t } from "../i18n/index.js";

/**
 * Web shop sign-in is not supported; same tone as car-owner web “coming soon”.
 */
export function renderShopAuthComingSoon(root: HTMLElement): void {
  root.innerHTML =
    '<div class="screen no-nav auth-welcome">' +
    '<div class="auth-welcome-card">' +
    `<p class="auth-welcome-title">${escapeHtml(t("landingComingSoon"))}</p>` +
    `<p class="auth-welcome-sub">${escapeHtml(t("shopWebSignInComingSoonBody"))}</p>` +
    `<a class="btn btn-primary" href="#/coming-soon">${escapeHtml(t("backToHome"))}</a>` +
    `<p class="auth-welcome-back" style="margin-top:20px;"><a class="coming-soon-legal-link" href="#/auth/welcome">${escapeHtml(t("carOwnerWebSignInLink"))}</a></p>` +
    "</div>" +
    "</div>";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
