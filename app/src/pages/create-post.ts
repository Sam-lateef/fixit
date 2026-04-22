import { Camera, CameraResultType } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";
import L from "leaflet";
import { t } from "../i18n/index.js";
import { navigate } from "../router.js";
import { apiFetch, uploadPhoto } from "../services/api.js";

const REPAIR = [
  "Engine",
  "Brakes",
  "Electrical",
  "AC",
  "Tyres",
  "Suspension",
  "Body & Paint",
  "Transmission",
  "Exhaust",
  "Oil & Fluids",
  "Other",
];

const PARTS = [
  "Engine parts",
  "Brakes",
  "Filters",
  "Electrical",
  "Suspension",
  "Body parts",
  "Tyres",
  "AC parts",
  "Exhaust",
  "Other",
];

export function renderCreatePost(root: HTMLElement): void {
  let service: "REPAIR" | "PARTS" | "TOWING" = "REPAIR";
  let repairCat = REPAIR[0];
  let partsCat = PARTS[0];
  const photoUrls: string[] = [];
  let towLat = 33.3152;
  let towLng = 44.4219;
  let towAddr = "";
  let map: L.Map | null = null;
  let marker: L.Marker | null = null;
  let urgency: "ASAP" | "WITHIN_HOUR" = "ASAP";
  let condNew = true;
  let condUsed = false;

  function paint(): void {
    root.innerHTML =
      '<div class="screen no-nav">' +
      '<div class="header">' +
      '<button type="button" class="btn btn-secondary" id="back" style="width:auto;">Back</button>' +
      '<h1 class="title">' +
      t("createPost") +
      "</h1>" +
      '<button type="button" class="btn btn-secondary" id="go" style="width:auto;">' +
      t("post") +
      "</button></div>" +
      '<div class="chip-row" id="types">' +
      `<button type="button" class="chip ${service === "REPAIR" ? "on" : ""}" data-s="REPAIR">${t("repair")}</button>` +
      `<button type="button" class="chip ${service === "PARTS" ? "on" : ""}" data-s="PARTS">${t("parts")}</button>` +
      `<button type="button" class="chip ${service === "TOWING" ? "on" : ""}" data-s="TOWING">${t("towing")}</button>` +
      "</div>" +
      '<div id="fields"></div>' +
      '<p id="err" class="danger"></p>' +
      "</div>";

    const fields = root.querySelector("#fields")!;
    if (service === "REPAIR") {
      fields.innerHTML =
        '<div class="chip-row" id="rc">' +
        REPAIR.map(
          (c) =>
            `<button type="button" class="chip ${c === repairCat ? "on" : ""}" data-c="${c}">${c}</button>`,
        ).join("") +
        "</div>" +
        '<textarea class="inp" id="desc" style="margin-top:12px;min-height:72px;"></textarea>' +
        '<button type="button" class="btn btn-secondary" style="margin-top:12px;" id="pic">Add photo</button>' +
        '<div id="ph" style="margin-top:8px;"></div>';
    } else if (service === "PARTS") {
      fields.innerHTML =
        '<div class="chip-row" id="pc">' +
        PARTS.map(
          (c) =>
            `<button type="button" class="chip ${c === partsCat ? "on" : ""}" data-c="${c}">${c}</button>`,
        ).join("") +
        "</div>" +
        '<p class="muted">Condition</p><div class="chip-row"><button type="button" class="chip' +
        (condNew ? " on" : "") +
        '" id="cn">New</button><button type="button" class="chip' +
        (condUsed ? " on" : "") +
        '" id="cu">Used</button></div>' +
        '<textarea class="inp" id="desc" style="margin-top:12px;min-height:72px;"></textarea>' +
        '<button type="button" class="btn btn-secondary" style="margin-top:12px;" id="pic">Add photo</button>' +
        '<div id="ph" style="margin-top:8px;"></div>';
    } else {
      fields.innerHTML =
        '<p class="muted">' +
        t("towingLocation") +
        '</p><div class="map-box" id="map"></div>' +
        '<p class="muted inp-ltr" id="taddr" style="direction:ltr;"></p>' +
        '<input class="inp" id="towto" placeholder="' +
        t("towTo") +
        '" />' +
        '<textarea class="inp" id="desc" style="margin-top:12px;min-height:60px;"></textarea>' +
        '<div class="chip-row" style="margin-top:8px;">' +
        `<button type="button" class="chip ${urgency === "ASAP" ? "on" : ""}" data-u="ASAP">` +
        t("asap") +
        "</button>" +
        `<button type="button" class="chip ${urgency === "WITHIN_HOUR" ? "on" : ""}" data-u="WITHIN_HOUR">` +
        t("withinHour") +
        "</button></div>";
      void initMap();
    }

    if (service === "REPAIR" || service === "PARTS") {
      const ph = fields.querySelector("#ph");
      if (ph && photoUrls.length > 0) {
        ph.innerHTML = photoUrls
          .map(
            (u) =>
              `<img src="${u}" style="height:48px;margin-right:4px;border-radius:6px;" />`,
          )
          .join("");
      }
    }

    wire();
  }

  async function initMap(): Promise<void> {
    try {
      const perm = await Geolocation.requestPermissions();
      if (perm.location === "granted") {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        towLat = pos.coords.latitude;
        towLng = pos.coords.longitude;
      }
    } catch {
      /* use default Baghdad */
    }
    const el = root.querySelector("#map");
    if (!el) return;
    map = L.map(el as HTMLElement).setView([towLat, towLng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "OSM",
    }).addTo(map);
    marker = L.marker([towLat, towLng], { draggable: true }).addTo(map);
    marker.on("dragend", () => {
      const ll = marker!.getLatLng();
      towLat = ll.lat;
      towLng = ll.lng;
      void reverseGeocode();
    });
    await reverseGeocode();
  }

  async function reverseGeocode(): Promise<void> {
    try {
      const res = await apiFetch<{ address: string }>(
        `/api/v1/geocode/reverse?lat=${towLat}&lng=${towLng}`,
      );
      towAddr = res.address;
      const ta = root.querySelector("#taddr");
      if (ta) ta.textContent = towAddr;
    } catch {
      towAddr = `${towLat.toFixed(5)}, ${towLng.toFixed(5)}`;
      const ta = root.querySelector("#taddr");
      if (ta) ta.textContent = towAddr;
    }
  }

  function wire(): void {
    root.querySelector("#back")?.addEventListener("click", () => {
      map?.remove();
      navigate("#/owner");
    });
    root.querySelector("#types")?.addEventListener("click", (ev) => {
      const b = (ev.target as HTMLElement).closest("button[data-s]");
      if (!b) return;
      map?.remove();
      map = null;
      marker = null;
      service = b.getAttribute("data-s") as typeof service;
      paint();
    });
    root.querySelector("#rc")?.addEventListener("click", (ev) => {
      const b = (ev.target as HTMLElement).closest("button[data-c]");
      if (!b) return;
      repairCat = b.getAttribute("data-c") ?? repairCat;
      paint();
    });
    root.querySelector("#pc")?.addEventListener("click", (ev) => {
      const b = (ev.target as HTMLElement).closest("button[data-c]");
      if (!b) return;
      partsCat = b.getAttribute("data-c") ?? partsCat;
      paint();
    });

    root.querySelectorAll("[data-u]").forEach((el) => {
      el.addEventListener("click", () => {
        root.querySelectorAll("[data-u]").forEach((x) => x.classList.remove("on"));
        el.classList.add("on");
        urgency = el.getAttribute("data-u") as typeof urgency;
      });
    });

    root.querySelector("#pic")?.addEventListener("click", async () => {
      if (photoUrls.length >= 3) return;
      const photo = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.Uri,
      });
      const blob = await fetch(photo.webPath!).then((r) => r.blob());
      const { url } = await uploadPhoto(blob);
      photoUrls.push(url);
      const ph = root.querySelector("#ph");
      if (ph) ph.innerHTML = photoUrls.map((u) => `<img src="${u}" style="height:48px;margin-right:4px;" />`).join("");
    });

    root.querySelector("#cn")?.addEventListener("click", () => {
      condNew = !condNew;
      root.querySelector("#cn")?.classList.toggle("on", condNew);
    });
    root.querySelector("#cu")?.addEventListener("click", () => {
      condUsed = !condUsed;
      root.querySelector("#cu")?.classList.toggle("on", condUsed);
    });

    const err = root.querySelector("#err")!;
    root.querySelector("#go")?.addEventListener("click", async () => {
      err.textContent = "";
      const desc =
        root.querySelector<HTMLTextAreaElement>("#desc")?.value.trim() ?? "";
      if (!desc) {
        err.textContent = "Description required";
        return;
      }
      try {
        if (service === "REPAIR") {
          const { user } = await apiFetch<{ user: { districtId: string | null } }>(
            "/api/v1/users/me",
          );
          if (!user.districtId) throw new Error("Set district in profile first");
          await apiFetch("/api/v1/posts", {
            method: "POST",
            body: JSON.stringify({
              serviceType: "REPAIR",
              repairCategory: repairCat,
              districtId: user.districtId,
              description: desc,
              photoUrls,
            }),
          });
        } else if (service === "PARTS") {
          const { user } = await apiFetch<{ user: { districtId: string | null } }>(
            "/api/v1/users/me",
          );
          if (!user.districtId) throw new Error("Set district in profile first");
          await apiFetch("/api/v1/posts", {
            method: "POST",
            body: JSON.stringify({
              serviceType: "PARTS",
              partsCategory: partsCat,
              conditionNew: condNew,
              conditionUsed: condUsed,
              districtId: user.districtId,
              description: desc,
              photoUrls,
              deliveryNeeded: false,
            }),
          });
        } else {
          const towto =
            root.querySelector<HTMLInputElement>("#towto")?.value ?? "";
          await apiFetch("/api/v1/posts", {
            method: "POST",
            body: JSON.stringify({
              serviceType: "TOWING",
              description: desc,
              photoUrls,
              towingFromLat: towLat,
              towingFromLng: towLng,
              towingFromAddress: towAddr,
              towingToAddress: towto,
              urgency,
            }),
          });
        }
        map?.remove();
        navigate("#/owner");
      } catch (e) {
        err.textContent = e instanceof Error ? e.message : "Failed";
      }
    });
  }

  paint();
}
