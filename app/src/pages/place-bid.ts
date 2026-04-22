import { t } from "../i18n/index.js";
import { navigate } from "../router.js";
import { apiFetch } from "../services/api.js";

export function renderPlaceBid(root: HTMLElement, postId: string): void {
  root.innerHTML =
    '<div class="screen no-nav">' +
    '<div class="header"><button type="button" class="btn btn-secondary" id="back" style="width:auto;">Back</button>' +
    '<h1 class="title">' +
    t("placeBid") +
    "</h1></div>" +
    '<input class="inp inp-ltr" id="price" type="number" placeholder="' +
    t("priceIqd") +
    '" />' +
    '<textarea class="inp" id="msg" style="margin-top:12px;min-height:80px;" placeholder="' +
    t("message") +
    '"></textarea>' +
    '<button class="btn btn-primary" style="margin-top:16px;" id="send">' +
    t("placeBid") +
    "</button>" +
    '<p id="err" class="danger"></p>' +
    "</div>";

  root.querySelector("#back")?.addEventListener("click", () => {
    navigate("#/shop");
  });
  const err = root.querySelector("#err")!;
  root.querySelector("#send")?.addEventListener("click", async () => {
    err.textContent = "";
    const price = Number(
      root.querySelector<HTMLInputElement>("#price")!.value,
    );
    const message = root.querySelector<HTMLTextAreaElement>("#msg")!.value.trim();
    if (!price || !message) {
      err.textContent = "Price and message required";
      return;
    }
    try {
      await apiFetch(`/api/v1/posts/${postId}/bids`, {
        method: "POST",
        body: JSON.stringify({
          priceEstimate: Math.round(price),
          message,
        }),
      });
      navigate("#/shop");
    } catch (e) {
      err.textContent = e instanceof Error ? e.message : "Failed";
    }
  });
}
