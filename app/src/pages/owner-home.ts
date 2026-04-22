import { t, formatIqd } from "../i18n/index.js";
import { navigate } from "../router.js";
import { apiFetch } from "../services/api.js";

type Shop = { id: string; name: string; rating: number };
type Bid = {
  id: string;
  priceEstimate: number;
  message: string;
  status: string;
  shop: Shop;
};
type Post = {
  id: string;
  serviceType: string;
  description: string;
  status: string;
  expiresAt: string;
  repairCategory?: string | null;
  bids: Bid[];
};

function ownerNav(active: "home" | "inbox" | "profile"): string {
  return (
    '<nav class="bottom-nav">' +
    `<button type="button" class="nav-item ${active === "home" ? "active" : ""}" data-h="#/owner">${t("myPosts")}</button>` +
    `<button type="button" class="fab" data-h="#/owner/create">+</button>` +
    `<button type="button" class="nav-item ${active === "inbox" ? "active" : ""}" data-h="#/owner/inbox">${t("inbox")}</button>` +
    `<button type="button" class="nav-item ${active === "profile" ? "active" : ""}" data-h="#/owner/profile">${t("profile")}</button>` +
    "</nav>"
  );
}

function tagFor(type: string): string {
  if (type === "REPAIR") return '<span class="tag-repair">Repair</span>';
  if (type === "PARTS") return '<span class="tag-parts">Parts</span>';
  return '<span class="tag-towing">Towing</span>';
}

export async function renderOwnerHome(root: HTMLElement): Promise<void> {
  const { posts } = await apiFetch<{ posts: Post[] }>("/api/v1/posts/mine");
  const cards = posts
    .filter((p) => p.status !== "DELETED")
    .map((p) => {
      const exp = new Date(p.expiresAt).getTime();
      const hrs = Math.max(0, Math.round((exp - Date.now()) / 3600000));
      const bids = p.bids
        .map((b, i) => {
          const best = i === 0 && p.bids.length > 0;
          return (
            '<div class="bid-card' +
            (best ? " best" : "") +
            '">' +
            (best ? '<span class="best-badge">Best</span>' : "") +
            "<div class=\"row-between\"><strong>" +
            formatIqd(b.priceEstimate) +
            "</strong><span class=\"muted\">" +
            b.shop.name +
            "</span></div>" +
            '<p class="muted" style="margin:6px 0;">' +
            escapeHtml(b.message) +
            "</p>" +
            (b.status === "PENDING" && p.status === "ACTIVE"
              ? '<button type="button" class="btn btn-primary btn-sm accept" data-bid="' +
                b.id +
                '">' +
                t("accept") +
                "</button>"
              : "") +
            "</div>"
          );
        })
        .join("");
      return (
        '<div class="card" data-post="' +
        p.id +
        '">' +
        '<div class="row-between">' +
        tagFor(p.serviceType) +
        '<span class="muted">' +
        hrs +
        "h left</span></div>" +
        "<p>" +
        escapeHtml(p.description) +
        "</p>" +
        bids +
        "</div>"
      );
    })
    .join("");

  root.innerHTML =
    '<div class="screen">' +
    '<div class="header"><h1 class="title">' +
    t("myPosts") +
    "</h1></div>" +
    (cards || '<p class="muted">No posts yet.</p>') +
    ownerNav("home") +
    "</div>";

  root.querySelectorAll(".accept").forEach((btn) => {
    btn.addEventListener("click", async (ev) => {
      const id = (ev.target as HTMLElement).getAttribute("data-bid");
      if (!id) return;
      const res = await apiFetch<{ chatThread: { id: string } }>(
        `/api/v1/bids/${id}/accept`,
        { method: "POST" },
      );
      navigate(`#/owner/chat/${res.chatThread.id}`);
    });
  });

  root.querySelectorAll("[data-h]").forEach((el) => {
    el.addEventListener("click", () => {
      const h = el.getAttribute("data-h");
      if (h) navigate(h);
    });
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
