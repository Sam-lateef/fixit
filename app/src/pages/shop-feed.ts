import { t, formatIqd } from "../i18n/index.js";
import { navigate } from "../router.js";
import { apiFetch } from "../services/api.js";

type Post = {
  id: string;
  serviceType: string;
  description: string;
  distanceKm: number | null;
  bids: Array<{ shopId: string }>;
};

function shopNav(active: "feed" | "bids" | "inbox" | "profile"): string {
  return (
    '<nav class="bottom-nav">' +
    `<button type="button" class="nav-item ${active === "feed" ? "active" : ""}" data-h="#/shop">${t("feed")}</button>` +
    `<button type="button" class="nav-item ${active === "bids" ? "active" : ""}" data-h="#/shop/bids">${t("myBids")}</button>` +
    `<button type="button" class="nav-item ${active === "inbox" ? "active" : ""}" data-h="#/shop/inbox">${t("inbox")}</button>` +
    `<button type="button" class="nav-item ${active === "profile" ? "active" : ""}" data-h="#/shop/profile">${t("profile")}</button>` +
    "</nav>"
  );
}

export async function renderShopFeed(root: HTMLElement): Promise<void> {
  const { shop } = await apiFetch<{ shop: { id: string; name: string } }>(
    "/api/v1/shops/me",
  );
  const { posts } = await apiFetch<{ posts: Post[] }>("/api/v1/feed");
  const myShopId = shop.id;
  const cards = posts
    .map((p) => {
      const dist =
        p.distanceKm != null
          ? `<span class="tag-repair" style="font-size:0.65rem;">${p.distanceKm} km</span>`
          : "";
      const hasBid = p.bids.some((b) => b.shopId === myShopId);
      return (
        '<div class="card">' +
        '<div class="row-between"><strong>' +
        p.serviceType +
        "</strong>" +
        dist +
        "</div>" +
        "<p class=\"muted\" style=\"margin:8px 0;\">" +
        p.description.slice(0, 160) +
        "</p>" +
        '<button type="button" class="btn btn-primary btn-sm bid" data-post="' +
        p.id +
        '">' +
        (hasBid ? "View / Edit bid" : t("placeBid")) +
        "</button>" +
        "</div>"
      );
    })
    .join("");

  root.innerHTML =
    '<div class="screen">' +
    '<div class="header"><h1 class="title">' +
    shop.name +
    "</h1></div>" +
    (cards || '<p class="muted">No matching posts.</p>') +
    shopNav("feed") +
    "</div>";

  root.querySelectorAll(".bid").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-post");
      if (id) navigate(`#/shop/bid/${id}`);
    });
  });
  root.querySelectorAll("[data-h]").forEach((el) => {
    el.addEventListener("click", () => {
      const h = el.getAttribute("data-h");
      if (h) navigate(h);
    });
  });
}
