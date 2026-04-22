import { t } from "../i18n/index.js";
import { navigate } from "../router.js";
import { apiFetch } from "../services/api.js";

type Thread = {
  id: string;
  bid: {
    post: { serviceType: string };
    shop: { name: string };
  };
  lastMessage: { content: string } | null;
};

export async function renderInbox(
  root: HTMLElement,
  role: "owner" | "shop",
): Promise<void> {
  const { threads } = await apiFetch<{ threads: Thread[] }>("/api/v1/threads");
  const base = role === "owner" ? "#/owner" : "#/shop";
  const items = threads
    .map(
      (th) =>
        '<button type="button" class="card" style="width:100%;text-align:start;cursor:pointer;" data-t="' +
        th.id +
        '">' +
        "<strong>" +
        th.bid.shop.name +
        "</strong>" +
        '<p class="muted">' +
        th.bid.post.serviceType +
        "</p>" +
        "<p>" +
        (th.lastMessage?.content?.slice(0, 80) ?? "") +
        "</p>" +
        "</button>",
    )
    .join("");

  root.innerHTML =
    '<div class="screen">' +
    '<div class="header"><h1 class="title">' +
    t("inbox") +
    "</h1></div>" +
    (items || '<p class="muted">No threads yet.</p>') +
    '<nav class="bottom-nav">' +
    `<button type="button" class="nav-item" data-h="${base}">` +
    (role === "owner" ? t("myPosts") : t("feed")) +
    "</button>" +
    `<button type="button" class="nav-item active" data-h="${base}/inbox">` +
    t("inbox") +
    "</button>" +
    `<button type="button" class="nav-item" data-h="${base}/profile">` +
    t("profile") +
    "</button>" +
    "</nav>" +
    "</div>";

  root.querySelectorAll("[data-t]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-t");
      if (id) navigate(`#/${role}/chat/${id}`);
    });
  });
  root.querySelectorAll("[data-h]").forEach((el) => {
    el.addEventListener("click", () => {
      const h = el.getAttribute("data-h");
      if (h) navigate(h);
    });
  });
}
