import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { getFirebaseAuthWeb, isFirebaseWebConfigured } from "../lib/firebase-web.js";
import { t } from "../i18n/index.js";
import { navigate } from "../router.js";
import { apiFetch } from "../services/api.js";
import { setToken } from "../services/auth-storage.js";

export function renderAuthWelcome(root: HTMLElement): void {
  if (!isFirebaseWebConfigured()) {
    root.innerHTML =
      '<div class="screen no-nav auth-welcome">' +
      '<div class="auth-welcome-card">' +
      `<p class="auth-welcome-title">${escapeHtml(t("landingComingSoon"))}</p>` +
      `<p class="auth-welcome-sub">${escapeHtml(t("carOwnerWebSignInComingSoonBody"))}</p>` +
      `<a class="btn btn-primary" href="#/coming-soon">${escapeHtml(t("backToHome"))}</a>` +
      `<p class="auth-welcome-muted" style="margin-top:18px;">` +
      `<a class="coming-soon-legal-link" href="#/auth/shop">${escapeHtml(t("shopOwnerWebLink"))}</a>` +
      `</p>` +
      "</div>" +
      "</div>";
    return;
  }

  root.innerHTML =
    '<div class="screen no-nav auth-welcome">' +
    '<div class="auth-welcome-card">' +
    '<div class="auth-welcome-brand">' +
    '<div class="brand-ar" dir="rtl">صلّحها</div>' +
    '<div class="brand-en">Fix It</div>' +
    "</div>" +
    `<p class="auth-welcome-title">${escapeHtml(t("authWelcomeTitle"))}</p>` +
    `<p class="auth-welcome-sub">${escapeHtml(t("authWelcomeSubtitle"))}</p>` +
    `<button type="button" class="btn btn-primary" id="auth-google">${escapeHtml(t("continueWithGoogle"))}</button>` +
    `<button type="button" class="btn btn-secondary" id="auth-apple" style="margin-top:12px;">${escapeHtml(t("continueWithApple"))}</button>` +
    `<a class="auth-welcome-phone" href="#/auth/shop">${escapeHtml(t("shopOwnerWebLink"))}</a>` +
    `<p class="auth-welcome-back"><a class="coming-soon-legal-link" href="#/coming-soon">${escapeHtml(t("backToHome"))}</a></p>` +
    '<p id="auth-err" class="danger" style="margin-top:12px;font-size:0.85rem;"></p>' +
    "</div>" +
    "</div>";

  const errEl = root.querySelector("#auth-err")!;

  async function exchangeSessionForJwt(): Promise<void> {
    const auth = getFirebaseAuthWeb();
    const u = auth.currentUser;
    if (!u) {
      throw new Error("No Firebase session");
    }
    const idToken = await u.getIdToken();
    const res = await apiFetch<{
      token: string;
      isNewUser: boolean;
      user: { userType: string };
    }>("/api/v1/auth/firebase", {
      method: "POST",
      body: JSON.stringify({ idToken }),
      skipAuth: true,
    });
    await setToken(res.token);
    if (res.isNewUser) {
      navigate("#/auth/account-type");
      return;
    }
    if (res.user.userType === "SHOP") {
      navigate("#/shop");
      return;
    }
    navigate("#/owner");
  }

  async function clearFirebaseAndShow(msg: string): Promise<void> {
    errEl.textContent = msg;
    try {
      const auth = getFirebaseAuthWeb();
      await signOut(auth);
    } catch {
      /* ignore */
    }
  }

  root.querySelector("#auth-google")?.addEventListener("click", () => {
    errEl.textContent = "";
    void (async () => {
      try {
        const auth = getFirebaseAuthWeb();
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await signInWithPopup(auth, provider);
        await exchangeSessionForJwt();
      } catch (e) {
        const msg = e instanceof Error ? e.message : t("authSignInFailed");
        await clearFirebaseAndShow(msg);
      }
    })();
  });

  root.querySelector("#auth-apple")?.addEventListener("click", () => {
    errEl.textContent = "";
    void (async () => {
      try {
        const auth = getFirebaseAuthWeb();
        const provider = new OAuthProvider("apple.com");
        provider.addScope("email");
        provider.addScope("name");
        await signInWithPopup(auth, provider);
        await exchangeSessionForJwt();
      } catch (e) {
        const msg = e instanceof Error ? e.message : t("authSignInFailed");
        await clearFirebaseAndShow(msg);
      }
    })();
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
