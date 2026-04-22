# Chat session summaries — FixIt

**Newest sessions at the TOP.** Each block: date, focus, outcome, follow-ups.

---

## 2026-04-10 — Locale gate, profile location, taxonomy i18n, RevenueCat UX

- **Focus:** Language before signup; owner profile city/district/address editing; Arabic labels for repair/parts categories and cities; shop profile subscription rows + shared paywall helper; API clears `districtId` when `city` changes without a new district.
- **Outcome:** `language-gate` + `locale-gate` storage (skipped for dev hub and migrated for logged-in users); `owner-details` / `owner-location` support `from=profile` with localized districts (`nameAr`) and cities; `taxonomy-labels.ts` centralizes slugs + EN/AR display strings; `PUT /users/me` uses `UserUncheckedUpdateInput` and nulls district on city change; `revenuecat-paywall.ts` + shop profile plans/restore; `ShopPaywall` refactored to use the helper.
- **Follow-ups:** Car make labels if desired; RevenueCat offering copy remains dashboard-side; optional success toast instead of `Alert` after restore.

---

## 2026-04-10 — Mobile auth, Firebase/Google, workflow

- **Focus:** Android native Google Sign-In (`DEVELOPER_ERROR`), `google-services.json`, keystore SHA mismatch (`android/app/debug.keystore` vs `~/.android`), Expo Go vs dev client, Metro port, `expo-keep-awake` / splash handling, user frustration with context loops.
- **Outcome:** Keystores aligned; `googleServicesFile` in `app.json`; components moved out of `app/` for Expo Router; `expo-keep-awake` direct dep + splash `.catch` in `_layout.tsx`; PATH for `adb`; `.cursor/rules/fixit-mobile-expo-google.mdc`; removed mistaken Ekkoo/shader commands; added **`AGENTS.md`**, FixIt **`/commands`**, minimal **`docs/*`** scaffold.
- **Follow-ups:** Apple, Facebook, email/password auth; EAS/release SHA in Firebase when shipping.

---
