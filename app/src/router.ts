import { t } from "./i18n/index.js";
import { getToken } from "./services/auth-storage.js";
import { renderComingSoon } from "./pages/coming-soon.js";
import { renderPrivacy, renderTerms } from "./pages/legal-info.js";
import { renderSplash } from "./pages/splash.js";
import { renderAuthWelcome } from "./pages/auth-welcome.js";
import { renderShopAuthComingSoon } from "./pages/auth-shop-welcome.js";
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

/** Re-run the current hash route (e.g. after changing locale on the landing page). */
export function refreshRoute(): void {
  void route();
}

export function startRouter(root: HTMLElement): void {
  ctx.root = root;
  window.addEventListener("hashchange", () => {
    void route();
  });
  void route();
}

async function route(): Promise<void> {
  const hash = window.location.hash.slice(1) || "/coming-soon";
  const root = ctx.root;
  root.innerHTML = "";

  if (hash === "/coming-soon" || hash === "/" || hash === "") {
    await renderComingSoon(root);
    return;
  }
  if (hash.startsWith("/privacy")) {
    renderPrivacy(root);
    return;
  }
  if (hash.startsWith("/terms")) {
    renderTerms(root);
    return;
  }
  if (hash.startsWith("/splash")) {
    renderSplash(root);
    return;
  }
  if (hash.startsWith("/auth/welcome")) {
    renderAuthWelcome(root);
    return;
  }
  if (hash.startsWith("/auth/number")) {
    navigate("#/auth/shop");
    return;
  }
  if (hash.startsWith("/auth/shop")) {
    renderShopAuthComingSoon(root);
    return;
  }
  if (hash.startsWith("/auth/otp")) {
    const phone = sessionStorage.getItem("fixit_phone") ?? "";
    if (!phone) {
      navigate("#/auth/shop");
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
      navigate("#/auth/welcome");
      return;
    }
    renderCreatePost(root);
    return;
  }
  if (hash.startsWith("/owner")) {
    const authed = await getToken();
    if (!authed) {
      navigate("#/auth/welcome");
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
      navigate("#/auth/shop");
      return;
    }
    renderPlaceBid(root, postId);
    return;
  }
  if (hash.startsWith("/shop")) {
    const authed = await getToken();
    if (!authed) {
      navigate("#/auth/shop");
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
