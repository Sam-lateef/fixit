import { t } from "../i18n/index.js";
import { navigate } from "../router.js";
import { apiFetch } from "../services/api.js";
import { setToken } from "../services/auth-storage.js";

export function renderAccountType(root: HTMLElement): void {
  let choice: "OWNER" | "SHOP" = "OWNER";
  root.innerHTML = `
    <div class="screen no-nav" style="background:#fff;">
      <h1 class="title">${t("accountType")}</h1>
      <div class="card" data-type="OWNER" id="c-owner" style="cursor:pointer;margin-top:16px;border:2px solid var(--color-primary-mid);background:var(--color-primary-light);">
        <strong>${t("carOwner")}</strong>
      </div>
      <div class="card" data-type="SHOP" id="c-shop" style="cursor:pointer;">
        <strong>${t("shop")}</strong>
      </div>
      <button class="btn btn-primary" style="margin-top:20px;" id="go">${t("continue")}</button>
    </div>
  `;
  const ownerEl = root.querySelector("#c-owner")!;
  const shopEl = root.querySelector("#c-shop")!;
  function paint(): void {
    ownerEl.setAttribute(
      "style",
      choice === "OWNER"
        ? "cursor:pointer;margin-top:16px;border:2px solid var(--color-primary-mid);background:var(--color-primary-light);"
        : "cursor:pointer;margin-top:16px;",
    );
    shopEl.setAttribute(
      "style",
      choice === "SHOP"
        ? "cursor:pointer;border:2px solid var(--color-primary-mid);background:var(--color-primary-light);"
        : "cursor:pointer;",
    );
  }
  ownerEl.addEventListener("click", () => {
    choice = "OWNER";
    paint();
  });
  shopEl.addEventListener("click", () => {
    choice = "SHOP";
    paint();
  });
  root.querySelector("#go")?.addEventListener("click", async () => {
    await apiFetch("/api/v1/users/me", {
      method: "PUT",
      body: JSON.stringify({ userType: choice }),
    });
    const refreshed = await apiFetch<{ token: string }>("/api/v1/auth/refresh", {
      method: "POST",
    });
    await setToken(refreshed.token);
    if (choice === "OWNER") navigate("#/signup/owner");
    else navigate("#/signup/shop");
  });
}
