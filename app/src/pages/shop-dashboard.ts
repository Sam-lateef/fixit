import { t } from "../i18n/index.js";

/**
 * Placeholder "coming soon" page for the shop owner's web dashboard.
 *
 * Mobile shop profile links here via the URL returned from
 * `GET /api/v1/public/config.shopDashboardUrl` (resolved server-side from the
 * `SHOP_DASHBOARD_URL` env var, with a Fly sibling fallback to this SPA).
 *
 * Intentionally **not auth-gated** — phase 1 is just informational. When the
 * real dashboard ships we will either replace this page or flip
 * `SHOP_DASHBOARD_URL` on the API to point at the new host.
 */
export function renderShopDashboard(root: HTMLElement): void {
  root.innerHTML =
    '<div class="screen no-nav auth-welcome">' +
    '<div class="auth-welcome-card">' +
    `<p class="auth-welcome-title">${escapeHtml(t("shopDashboardTitle"))}</p>` +
    `<p class="auth-welcome-sub">${escapeHtml(t("shopDashboardComingSoonBody"))}</p>` +
    `<a class="btn btn-primary" href="#/coming-soon">${escapeHtml(t("backToHome"))}</a>` +
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
