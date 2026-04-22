import { t } from "./i18n/index.js";
import { getToken } from "./services/auth-storage.js";
import { renderSplash } from "./pages/splash.js";
import { renderEnterNumber } from "./pages/enter-number.js";
import { renderOtp } from "./pages/otp.js";
import { renderAccountType } from "./pages/account-type.js";
import { renderOwnerDetails } from "./pages/owner-details.js";
import { renderOwnerLocation } from "./pages/owner-location.js";
import { renderOwnerHome } from "./pages/owner-home.js";
import { renderShopSignup } from "./pages/shop-signup.js";
import { renderShopFeed } from "./pages/shop-feed.js";
import { renderCreatePost } from "./pages/create-post.js";
import { renderProfile } from "./pages/profile.js";
import { renderInbox } from "./pages/inbox.js";
import { renderChat } from "./pages/chat.js";
import { renderPlaceBid } from "./pages/place-bid.js";
import { renderShopBids } from "./pages/shop-bids.js";

export type RouteContext = {
  root: HTMLElement;
  phone?: string;
};

const ctx: RouteContext = { root: document.body };

export function navigate(hash: string): void {
  window.location.hash = hash;
}

export function startRouter(root: HTMLElement): void {
  ctx.root = root;
  window.addEventListener("hashchange", () => {
    void route();
  });
  void route();
}

async function route(): Promise<void> {
  const hash = window.location.hash.slice(1) || "/splash";
  const root = ctx.root;
  root.innerHTML = "";

  if (hash.startsWith("/splash")) {
    renderSplash(root);
    return;
  }
  if (hash.startsWith("/auth/number")) {
    renderEnterNumber(root);
    return;
  }
  if (hash.startsWith("/auth/otp")) {
    const phone = sessionStorage.getItem("fixit_phone") ?? "";
    if (!phone) {
      navigate("#/auth/number");
      return;
    }
    renderOtp(root, phone);
    return;
  }
  if (hash.startsWith("/auth/account-type")) {
    renderAccountType(root);
    return;
  }
  if (hash.startsWith("/signup/owner-location")) {
    await renderOwnerLocation(root);
    return;
  }
  if (hash === "/signup/owner") {
    renderOwnerDetails(root);
    return;
  }
  if (hash.startsWith("/signup/shop")) {
    await renderShopSignup(root);
    return;
  }
  if (hash.startsWith("/owner/create")) {
    const authed = await getToken();
    if (!authed) {
      navigate("#/auth/number");
      return;
    }
    renderCreatePost(root);
    return;
  }
  if (hash.startsWith("/owner")) {
    const authed = await getToken();
    if (!authed) {
      navigate("#/auth/number");
      return;
    }
    if (hash.startsWith("/owner/chat/")) {
      const id = hash.replace("/owner/chat/", "");
      await renderChat(root, id, "owner");
      return;
    }
    if (hash === "/owner/inbox") {
      await renderInbox(root, "owner");
      return;
    }
    if (hash === "/owner/profile") {
      await renderProfile(root, "owner");
      return;
    }
    await renderOwnerHome(root);
    return;
  }
  if (hash.startsWith("/shop/bid/")) {
    const postId = hash.replace("/shop/bid/", "");
    const authed = await getToken();
    if (!authed) {
      navigate("#/auth/number");
      return;
    }
    renderPlaceBid(root, postId);
    return;
  }
  if (hash.startsWith("/shop")) {
    const authed = await getToken();
    if (!authed) {
      navigate("#/auth/number");
      return;
    }
    if (hash.startsWith("/shop/chat/")) {
      const id = hash.replace("/shop/chat/", "");
      await renderChat(root, id, "shop");
      return;
    }
    if (hash === "/shop/inbox") {
      await renderInbox(root, "shop");
      return;
    }
    if (hash === "/shop/profile") {
      await renderProfile(root, "shop");
      return;
    }
    if (hash === "/shop/bids") {
      await renderShopBids(root);
      return;
    }
    await renderShopFeed(root);
    return;
  }

  root.innerHTML = `<div class="screen"><p>${t("welcome")}</p></div>`;
}
