import { t } from "../i18n/index.js";
import { navigate } from "../router.js";
import { apiFetch } from "../services/api.js";

type District = { id: string; name: string; city: string };

export async function renderShopSignup(root: HTMLElement): Promise<void> {
  const { districts } = await apiFetch<{ districts: District[] }>(
    "/api/v1/districts?city=Baghdad",
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
    t("shopName") +
    "</h1>" +
    '<input class="inp" id="name" style="margin-top:12px;" />' +
    '<p class="muted" style="margin-top:12px;">Services</p>' +
    '<label><input type="checkbox" id="r" checked /> Repair</label><br/>' +
    '<label><input type="checkbox" id="p" /> Parts</label><br/>' +
    '<label><input type="checkbox" id="w" /> Towing</label>' +
    '<p class="muted" style="margin-top:12px;">Car makes (comma)</p>' +
    '<input class="inp inp-ltr" id="makes" value="Toyota,Kia" />' +
    '<p class="muted" style="margin-top:12px;">Repair categories (comma)</p>' +
    '<input class="inp inp-ltr" id="rcats" value="Engine,Brakes" />' +
    '<p class="muted" style="margin-top:12px;">Parts categories (comma)</p>' +
    '<input class="inp inp-ltr" id="pcats" value="Engine parts,Brakes" />' +
    '<p class="muted" style="margin-top:12px;">' +
    t("district") +
    "</p>" +
    '<div class="chip-row" id="chips">' +
    chips +
    "</div>" +
    '<label style="display:block;margin-top:12px;"><input type="checkbox" id="nation" /> Parts nationwide</label>' +
    '<label style="display:block;margin-top:8px;"><input type="checkbox" id="del" /> Delivery available</label>' +
    '<button class="btn btn-primary" style="margin-top:20px;" id="go">' +
    t("createShop") +
    "</button>" +
    '<p id="err" class="danger"></p>' +
    "</div>";

  let selected: string | null = districts[0]?.id ?? null;
  root.querySelector("#chips")?.addEventListener("click", (ev) => {
    const el = (ev.target as HTMLElement).closest("button[data-id]");
    if (!el) return;
    selected = el.getAttribute("data-id");
    root.querySelectorAll("#chips .chip").forEach((c) => c.classList.remove("on"));
    el.classList.add("on");
  });
  if (selected) {
    root.querySelector(`button[data-id="${selected}"]`)?.classList.add("on");
  }

  const err = root.querySelector("#err")!;
  root.querySelector("#go")?.addEventListener("click", async () => {
    err.textContent = "";
    const name = root.querySelector<HTMLInputElement>("#name")!.value.trim();
    const offersRepair = root.querySelector<HTMLInputElement>("#r")!.checked;
    const offersParts = root.querySelector<HTMLInputElement>("#p")!.checked;
    const offersTowing = root.querySelector<HTMLInputElement>("#w")!.checked;
    if (!name || (!offersRepair && !offersParts && !offersTowing)) {
      err.textContent = "Name and at least one service required";
      return;
    }
    if (!selected) {
      err.textContent = "Pick district";
      return;
    }
    const makes = root
      .querySelector<HTMLInputElement>("#makes")!
      .value.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const repairCategories = root
      .querySelector<HTMLInputElement>("#rcats")!
      .value.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const partsCategories = root
      .querySelector<HTMLInputElement>("#pcats")!
      .value.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await apiFetch("/api/v1/shops", {
        method: "POST",
        body: JSON.stringify({
          name,
          offersRepair,
          offersParts,
          offersTowing,
          carMakes: makes.length ? makes : ["Toyota"],
          repairCategories: offersRepair
            ? repairCategories.length
              ? repairCategories
              : ["Engine"]
            : [],
          partsCategories: offersParts
            ? partsCategories.length
              ? partsCategories
              : ["Engine parts"]
            : [],
          deliveryAvailable: root.querySelector<HTMLInputElement>("#del")!.checked,
          repairRadiusKm: 15,
          partsRadiusKm: 20,
          towingRadiusKm: 8,
          partsNationwide: root.querySelector<HTMLInputElement>("#nation")!.checked,
          city: "Baghdad",
          districtId: selected,
        }),
      });
      navigate("#/shop");
    } catch (e) {
      err.textContent = e instanceof Error ? e.message : "Failed";
    }
  });
}
