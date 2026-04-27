import { t, setLocale, getLocale } from "../i18n/index.js";
import { navigate } from "../router.js";
import { apiFetch } from "../services/api.js";
import { clearToken } from "../services/auth-storage.js";

export async function renderProfile(
  root: HTMLElement,
  role: "owner" | "shop",
): Promise<void> {
  const { user } = await apiFetch<{
    user: { phone: string; name: string | null };
  }>("/api/v1/users/me");
  const base = role === "owner" ? "#/owner" : "#/shop";
  root.innerHTML =
    '<div class="screen">' +
    '<div class="header"><h1 class="title">' +
    t("profile") +
    "</h1></div>" +
    '<div class="card"><p><strong>' +
    (user.name ?? "") +
    "</strong></p><p class=\"muted inp-ltr\" style=\"direction:ltr;\">" +
    user.phone +
    "</p></div>" +
    '<button type="button" class="btn btn-secondary" id="lang">' +
    t("language") +
    ": " +
    getLocale() +
    "</button>" +
    '<button type="button" class="btn btn-secondary" style="margin-top:12px;color:var(--color-danger);" id="out">' +
    t("logout") +
    "</button>" +
    '<nav class="bottom-nav">' +
    `<button type="button" class="nav-item" data-h="${base}">` +
    (role === "owner" ? t("myPosts") : t("feed")) +
    "</button>" +
    `<button type="button" class="nav-item" data-h="${base}/inbox">` +
    t("inbox") +
    "</button>" +
    `<button type="button" class="nav-item active" data-h="${base}/profile">` +
    t("profile") +
    "</button>" +
    "</nav>" +
    "</div>";

  root.querySelector("#lang")?.addEventListener("click", () => {
    setLocale(getLocale() === "en" ? "ar-iq" : "en");
    void renderProfile(root, role);
  });
  root.querySelector("#out")?.addEventListener("click", async () => {
    await clearToken();
    navigate("#/auth/welcome");
  });
  root.querySelectorAll("[data-h]").forEach((el) => {
    el.addEventListener("click", () => {
      const h = el.getAttribute("data-h");
      if (h) navigate(h);
    });
  });
}
