import { t } from "../i18n/index.js";
import { navigate } from "../router.js";
import { apiFetch } from "../services/api.js";

type District = {
  id: string;
  name: string;
  city: string;
};

export async function renderOwnerLocation(root: HTMLElement): Promise<void> {
  const city =
    sessionStorage.getItem("fixit_owner_city") ?? "Baghdad";
  const { districts } = await apiFetch<{ districts: District[] }>(
    `/api/v1/districts?city=${encodeURIComponent(city)}`,
  );
  const chips = districts
    .map(
      (d) =>
        `<button type="button" class="chip" data-id="${d.id}">${d.name}</button>`,
    )
    .join("");
  root.innerHTML =
    '<div class="screen no-nav" style="background:#fff;">' +
    '<h1 class="title">' +
    t("district") +
    "</h1>" +
    '<div class="chip-row" style="margin-top:12px;" id="chips">' +
    chips +
    "</div>" +
    '<input class="inp" id="addr" style="margin-top:16px;" placeholder="Address (optional)" />' +
    '<button class="btn btn-primary" style="margin-top:20px;" id="go">' +
    t("finishSetup") +
    "</button>" +
    '<p id="err" class="danger"></p>' +
    "</div>";
  let selected: string | null = null;
  root.querySelector("#chips")?.addEventListener("click", (ev) => {
    const t = ev.target as HTMLElement;
    const btn = t.closest("button[data-id]");
    if (!btn) return;
    selected = btn.getAttribute("data-id");
    root.querySelectorAll("#chips .chip").forEach((c) => c.classList.remove("on"));
    btn.classList.add("on");
  });
  const err = root.querySelector("#err")!;
  root.querySelector("#go")?.addEventListener("click", async () => {
    err.textContent = "";
    if (!selected) {
      err.textContent = "Pick a district";
      return;
    }
    const address = root.querySelector<HTMLInputElement>("#addr")!.value;
    await apiFetch("/api/v1/users/me", {
      method: "PUT",
      body: JSON.stringify({ districtId: selected, address }),
    });
    navigate("#/owner");
  });
}
