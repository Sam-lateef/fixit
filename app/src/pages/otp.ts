import { isDevMockAuthUiEnabled } from "../config/dev-auth.js";
import { t } from "../i18n/index.js";
import { navigate } from "../router.js";
import { apiFetch } from "../services/api.js";
import { setToken } from "../services/auth-storage.js";

export function renderOtp(root: HTMLElement, phone: string): void {
  const devHint = isDevMockAuthUiEnabled()
    ? '<p class="muted" style="font-size:0.75rem;margin-top:8px;">Dev: enter the code from <code>api/.env</code> → <code>DEV_OTP_BYPASS_CODE</code> (no WhatsApp).</p>'
    : "";

  root.innerHTML =
    '<div class="screen no-nav" style="background:#fff;">' +
    '<div class="header"><h1 class="title">' +
    t("otpHint") +
    "</h1></div>" +
    '<p class="muted inp-ltr" style="direction:ltr;">' +
    phone +
    "</p>" +
    devHint +
    '<input class="inp inp-ltr" id="code" maxlength="8" placeholder="000000" style="margin-top:12px;letter-spacing:4px;" />' +
    '<button class="btn btn-primary" style="margin-top:16px;" id="go">' +
    t("verify") +
    "</button>" +
    '<p id="err" class="danger" style="margin-top:12px;font-size:0.8rem;"></p>' +
    "</div>";
  const err = root.querySelector("#err")!;
  root.querySelector("#go")?.addEventListener("click", async () => {
    err.textContent = "";
    const input = root.querySelector<HTMLInputElement>("#code");
    const code = input?.value.trim() ?? "";
    try {
      const res = await apiFetch<{
        token: string;
        isNewUser: boolean;
        user: { userType: string };
      }>("/api/v1/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone, code }),
        skipAuth: true,
      });
      await setToken(res.token);
      if (res.isNewUser) {
        navigate("#/auth/account-type");
      } else if (res.user.userType === "SHOP") {
        navigate("#/shop");
      } else {
        navigate("#/owner");
      }
    } catch (e) {
      err.textContent = e instanceof Error ? e.message : "Failed";
    }
  });
}
