import { t } from "../i18n/index.js";
import { navigate } from "../router.js";

export function renderSplash(root: HTMLElement): void {
  root.innerHTML =
    '<div class="splash">' +
    '<div style="font-size:2rem;margin-bottom:12px;">Fix</div>' +
    '<div style="font-size:1.4rem;font-weight:500;">' +
    t("appName") +
    "</div>" +
    '<div style="margin-top:8px;opacity:0.6;font-size:0.85rem;">' +
    t("tagline") +
    "</div>" +
    "</div>";
  setTimeout(() => navigate("#/auth/number"), 1800);
  root.querySelector(".splash")?.addEventListener("click", () => {
    navigate("#/auth/number");
  });
}
