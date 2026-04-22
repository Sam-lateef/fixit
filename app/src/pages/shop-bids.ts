import { t, formatIqd } from "../i18n/index.js";
import { navigate } from "../router.js";
import { apiFetch } from "../services/api.js";

type Bid = {
  id: string;
  status: string;
  priceEstimate: number;
  post: { id: string; serviceType: string; description: string; status: string };
};

export async function renderShopBids(root: HTMLElement): Promise<void> {
  const { bids } = await apiFetch<{ bids: Bid[] }>("/api/v1/bids/mine");
  const pending = bids.filter((b) => b.status === "PENDING");
  const accepted = bids.filter((b) => b.status === "ACCEPTED");
  const rest = bids.filter(
    (b) => b.status !== "PENDING" && b.status !== "ACCEPTED",
  );

  const sec = (title: string, list: Bid[]) =>
    "<h2 class=\"title\" style=\"font-size:1rem;margin-top:16px;\">" +
    title +
    "</h2>" +
    list
      .map(
        (b) =>
          '<div class="card"><div class="row-between"><span>' +
          b.post.serviceType +
          "</span><strong>" +
          formatIqd(b.priceEstimate) +
          "</strong></div><p class=\"muted\">" +
          b.post.description.slice(0, 100) +
          "</p><p class=\"muted\">" +
          b.status +
          "</p></div>",
      )
      .join("");

  root.innerHTML =
    '<div class="screen">' +
    '<div class="header"><h1 class="title">' +
    t("myBids") +
    "</h1></div>" +
    sec("Pending", pending) +
    sec("Accepted", accepted) +
    sec("Closed", rest) +
    '<nav class="bottom-nav">' +
    '<button type="button" class="nav-item" data-h="#/shop">' +
    t("feed") +
    "</button>" +
    '<button type="button" class="nav-item active" data-h="#/shop/bids">' +
    t("myBids") +
    "</button>" +
    '<button type="button" class="nav-item" data-h="#/shop/inbox">' +
    t("inbox") +
    "</button>" +
    '<button type="button" class="nav-item" data-h="#/shop/profile">' +
    t("profile") +
    "</button>" +
    "</nav>" +
    "</div>";

  root.querySelectorAll("[data-h]").forEach((el) => {
    el.addEventListener("click", () => {
      const h = el.getAttribute("data-h");
      if (h) navigate(h);
    });
  });
}
