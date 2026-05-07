# Chat session summaries — FixIt

**Newest sessions at the TOP.** Each block: date, focus, outcome, follow-ups.

---

## 2026-05-09 — `/end` session wrap-up

- **Accomplished:** Per-recipient push locale (`User.preferredLocale`, `push-i18n`, mobile `sync-preferred-locale` + bootstrap); localized chat header subtitle; shop signup **optional district** + **required address** (API + mobile + profile editor); Iraqi Arabic repair/parts labels in `taxonomy-labels.ts`; shop feed **distance hidden** except **TOWING**; **`workshopLat`/`workshopLng`** on `User` with migrations, feed + towing notify preferring pin; **`open-google-maps.ts`** (coords, search, `openShopInGoogleMaps`); owner **shop profile** directions; **towing pickup** card in chat for **shop** when bid **ACCEPTED**; documentation handoff in `progress.md`, `specs.md`, and detailed block below.
- **Not finished:** Human QA tomorrow (Windows); **iOS** build/parity on Mac not run this session; production **`prisma migrate deploy`** + env on deploy target is operator-side.
- **Risks / follow-ups:** Verify **`Linking.openURL`** → Google Maps on **iOS**; **`expo-location`** permission string after prebuild; towing distance still approximate if shop has **no pin and no district**; existing users need app open or language toggle to sync `preferredLocale` for Arabic pushes.
- **Files touched (high level):** `api/prisma/schema.prisma`, migrations under `api/prisma/migrations/` (e.g. `*preferred_locale*`, `*workshop_coords*`), `api/src/services/push-i18n.ts`, `api/src/lib/workshop-coords.ts`, `api/src/routes/users.ts`, `shops.ts`, `posts.ts`, `bids.ts`, `api/src/services/notify-shops.ts`, `feed-filter.ts`, `feed-filter.test.ts`, `api/src/routes/chat.ts`, `api/src/socket/chat.ts`; `mobile/lib/open-google-maps.ts`, `sync-preferred-locale.ts`, `locale-storage.ts`, `i18n.tsx`, `bootstrap.ts`, `strings.ts`, `taxonomy-labels.ts`, `mobile/app/shop/(tabs)/index.tsx`, `profile.tsx`, `mobile/app/signup/shop-location.tsx`, `shop-area.tsx`, `mobile/app/owner/shop/[shopId].tsx`, `mobile/app/chat/[threadId].tsx`, `mobile/components/shop/shop-profile-model.ts`; `docs/progress.md`, `docs/specs.md`, `docs/chatSummaries.md`.

---

## 2026-05-09 — Push AR/EN, shop signup, taxonomy, distance, workshop GPS, Maps (handoff for Mac / iOS)

- **Focus:** Per-recipient push locale; localized chat header; shop signup without mandatory district; Iraqi Arabic repair/parts labels; hide inaccurate feed distance except towing; optional workshop GPS; Google Maps from owner→shop profile and shop→towing pickup in chat after bid accepted.
- **Outcome:**
  - **API:** `User.preferredLocale`, `User.workshopLat`/`workshopLng`; `push-i18n.ts`; `workshop-coords` zod; feed + towing notify use workshop pin when set; shops/users accept optional `districtId` null and required shop address on create.
  - **Mobile:** `sync-preferred-locale.ts`, `locale-storage.ts`, `open-google-maps.ts` (coords + search + `openShopInGoogleMaps`); shop feed distance pill only for `TOWING`; owner `shop/[shopId]` directions; chat `ThreadPost` fields + towing pickup card for shop when `ACCEPTED`; i18n keys for map/workshop/towing pickup.
- **Follow-ups (next session, especially on Mac / iOS):** Run full **iOS** build (`npx expo run:ios` or EAS); confirm **location** permission and **Maps** `Linking` behavior; end-to-end test push language, signup, towing chat card, and migrations on deployed API. See **`docs/progress.md`** → *“2026-05-09 — Handoff”* for the checklist table.

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
