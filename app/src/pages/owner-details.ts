import { t } from "../i18n/index.js";
import { navigate } from "../router.js";
import { apiFetch } from "../services/api.js";

const CITIES = [
  "Baghdad",
  "Basra",
  "Mosul",
  "Erbil",
  "Najaf",
  "Karbala",
  "Kirkuk",
  "Other",
];

export function renderOwnerDetails(root: HTMLElement): void {
  const opts = CITIES.map((c) => `<option value="${c}">${c}</option>`).join("");
  root.innerHTML =
    '<div class="screen no-nav" style="background:#fff;">' +
    '<h1 class="title">' +
    t("name") +
    "</h1>" +
    '<input class="inp" id="name" style="margin-top:12px;" />' +
    '<label class="muted" style="display:block;margin-top:16px;">' +
    t("city") +
    "</label>" +
    '<select class="inp" id="city" style="margin-top:6px;">' +
    opts +
    "</select>" +
    '<button class="btn btn-primary" style="margin-top:20px;" id="go">' +
    t("continue") +
    "</button>" +
    '<p id="err" class="danger" style="margin-top:12px;font-size:0.8rem;"></p>' +
    "</div>";
  const errEl = root.querySelector("#err")!;
  root.querySelector("#go")?.addEventListener("click", async () => {
    errEl.textContent = "";
    const name = root.querySelector<HTMLInputElement>("#name")!.value.trim();
    const city = root.querySelector<HTMLSelectElement>("#city")!.value;
    if (!name) {
      errEl.textContent = t("nameRequired");
      return;
    }
    try {
      await apiFetch("/api/v1/users/me", {
        method: "PUT",
        body: JSON.stringify({ name, city }),
      });
      sessionStorage.setItem("fixit_owner_city", city);
      navigate("#/signup/owner-location");
    } catch (e) {
      errEl.textContent = e instanceof Error ? e.message : "Failed";
    }
  });
}
