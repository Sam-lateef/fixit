import { devMockPhoneE164, isDevMockAuthUiEnabled } from "../config/dev-auth.js";
import { t } from "../i18n/index.js";
import { navigate } from "../router.js";
import { apiFetch } from "../services/api.js";

export function renderEnterNumber(root: HTMLElement): void {
  const devPanel =
    isDevMockAuthUiEnabled()
      ? `<div class="card" style="background:#fff8e6;border-color:#f59e0b;margin-bottom:16px;">
          <p class="muted" style="margin:0 0 8px;font-size:0.75rem;">Dev only — no real phone</p>
          <button type="button" class="btn btn-secondary" id="dev-mock" style="width:100%;">Continue without SMS (mock number)</button>
        </div>`
      : "";

  root.innerHTML = `
    <div class="screen no-nav" style="background:#fff;">
      <div class="header"><h1 class="title">${t("welcome")}</h1></div>
      ${devPanel}
      <p class="muted">${t("enterPhoneHint")}</p>
      <div style="display:flex;gap:8px;margin:16px 0;direction:ltr;">
        <input class="inp inp-ltr" style="width:90px;text-align:center;" value="+964" readonly />
        <input class="inp inp-ltr" id="phone" type="tel" placeholder="7xx xxx xxxx" maxlength="15" />
      </div>
      <button class="btn btn-primary" id="send">${t("sendCode")}</button>
      <p id="err" class="danger" style="margin-top:12px;font-size:0.8rem;"></p>
    </div>
  `;
  const phoneEl = root.querySelector<HTMLInputElement>("#phone")!;
  const err = root.querySelector("#err")!;

  async function goSendOtp(full: string): Promise<void> {
    err.textContent = "";
    try {
      await apiFetch<{ success: boolean }>("/api/v1/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone: full }),
        skipAuth: true,
      });
      sessionStorage.setItem("fixit_phone", full);
      navigate("#/auth/otp");
    } catch (e) {
      err.textContent = e instanceof Error ? e.message : "Failed";
    }
  }

  root.querySelector("#dev-mock")?.addEventListener("click", () => {
    void goSendOtp(devMockPhoneE164());
  });

  root.querySelector("#send")?.addEventListener("click", async () => {
    const digits = phoneEl.value.replace(/\D/g, "").replace(/^964/, "");
    if (digits.length !== 10 || digits[0] !== "7") {
      err.textContent = "Enter 10 digits starting with 7 (e.g. 7901234567)";
      return;
    }
    const full = `+964${digits}`;
    await goSendOtp(full);
  });
}
