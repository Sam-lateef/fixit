# Progress tracker — FixIt

Newest first. Use **`/checkpoint`** mid-session and **`/end`** to append.

---

## Template entry (copy when logging)

```text
### YYYY-MM-DD — short title
- What shipped / changed
- PR or branch (optional)
```

---

### 2026-06-06 — Post TTL: 48h → 72h + success-popup hint

- **Backend:** `api/src/routes/posts.ts` post `expiresAt` window bumped from 48h to **72h** (3 days). Comment cross-references the user-facing copy so the two stay in sync.
- **Mobile:** Successful "Post sent" alert now includes a body hint: **"Request will be removed if no shop responds in 3 days."** (IQ-AR: "راح ينحذف الطلب إذا ما رد عليه أي محل خلال 3 أيام."). New i18n key `postCreatedBody` (EN + IQ-AR); single call site in `mobile/components/OwnerPostEditor.tsx`. Edit-post popup unchanged (uses `postUpdated`).
- **Behavior note:** Posts aren't row-deleted by the cron — `api/src/cron/expiry.ts` flips `status` `ACTIVE → EXPIRED` every 5 min once `expiresAt` passes, and `feed.ts` filters them out. Copy says "removed" (user-visible behavior) rather than "deleted".
- Typecheck: API + mobile both clean.

### 2026-06-06 — Phase-1 polish: hide in-app subscription, 15MB uploads, comprehensive Iraq districts + IQ vehicle catalog

- **Hide subscription UI app-wide** (phase-1 = free, paywall later via web dashboard):
  - Shop profile `Subscription` row → replaced with new **Web dashboard** row that opens `shopDashboardUrl` from `/api/v1/public/config`. URL pre-fetched + cached on mount; opens via `Linking.openURL`.
  - `mobile/app/shop/subscription.tsx` → `<Redirect to="/shop/profile" />`; removed from `_layout.tsx` Stack.
  - `ShopPremiumGate` already a no-op since April; left untouched.
  - Owner profile confirmed had no subscription entry points.
- **API `/api/v1/public/config`** now returns `shopDashboardUrl`: prefers `SHOP_DASHBOARD_URL` env var, else falls back to `${APP_URL}/#/shop/dashboard` or Fly-app naming convention. New SPA route `#/shop/dashboard` renders an i18n "coming soon" placeholder (`app/src/pages/shop-dashboard.ts`). Documented in `api/.env.example`.
- **New mobile util:** `mobile/lib/shop-dashboard-url.ts` — module-level cache + single-flight fetch, env override via `EXPO_PUBLIC_SHOP_DASHBOARD_URL`. i18n keys `webDashboard`, `webDashboardOpenFailed` (EN + IQ-AR).
- **Photo upload limit raised 2/3 MB → 15 MB:** `api/src/app.ts` multipart `fileSize` and `api/src/routes/uploads.ts` `MAX_BYTES`; error copy uses `MAX_MB` dynamically. Implementation guide updated.
- **Iraq districts now comprehensive** (all 19 governorates):
  - New single source of truth: `api/prisma/data/districts.json` (236 rows — 111 Baghdad neighborhoods with centroids merged, official qadhaa for the other 18 governorates, every governorate center explicitly listed as a selectable area).
  - `api/src/lib/catalog-json-seed.ts` gained `loadDistrictSeedRows()` + `upsertDistrictsFromJson()` (idempotent, never deletes — keeps user/shop FKs intact).
  - `api/prisma/seed.ts` collapsed ~280 lines of inline data → single `upsertDistrictsFromJson(prisma)` call.
  - `api/src/routes/districts.ts` runtime fallback: full bootstrap if empty DB, per-city lazy seed when a specific city has zero districts.
  - `api/src/lib/iraq-city.ts` `CANONICAL` map expanded to all 19 governorates + common aliases so city-name normalization is consistent across signup, posts, and feeds.
- **IQ vehicle catalog now comprehensive** (closes 2026-05-22 deferred item):
  - `api/prisma/data/vehicles-iq.json` grew **33 → 79 makes** and **~150 → 377 models**. The 25 popular-tier makes (sortOrder 0–24: Toyota, Hyundai, Kia, Nissan, Chevrolet, GMC, Ford, Honda, Mazda, Mitsubishi, VW, Mercedes, BMW, Lexus, Isuzu, Renault, Peugeot, Chery, Changan, MG, Haval, Jetour, Audi, Land Rover, Jeep) are **unchanged byte-for-byte** — same order, same models, same year ranges.
  - **44 new makes appended at sortOrder 1000** (alphabetized fallback tier): Acura, Alfa Romeo, Aston Martin, BAIC, Bentley, Buick, Cadillac, Chrysler, Citroen, Dacia, Daihatsu, Dodge, Dongfeng, FAW, Ferrari, Foton, GAC, Genesis, Great Wall, Hongqi, Hummer, Infiniti, Iran Khodro, JAC, Jaguar, Lada, Lamborghini, Lincoln, Lotus, Lynk & Co, Mahindra, Maserati, McLaren, Mini, NIO, Polestar, RAM, Rolls-Royce, Saipa, Smart, SsangYong, Tata, UAZ, XPeng. Each carries Iraq-relevant models (3–8 each) with English + IQ-Arabic names and Iraq-realistic year ranges (e.g. Saipa Pride 1993–2020 still around; Hummer H1/H2/H3 historic ranges).
  - No schema changes — the existing `upsertVehiclesIqFromJson` loader handles the new rows; idempotent upsert keyed on `VehicleMake.name` and `(makeId, name)` for models, year rows auto-capped at current year.
- **Typecheck clean.** JSON validators (197 new vehicle rows, 236 district rows) verified shape, uniqueness, year sanity, and full nameAr coverage with 0 warnings / 0 errors.

### 2026-05-28 — Chat keyboard overlap fix (Android edge-to-edge)

- Added `react-native-keyboard-controller@1.18.5` (SDK 54-compatible install via `npx expo install`).
- Wrapped root layout with `<KeyboardProvider>` (`mobile/app/_layout.tsx`).
- Chat screen (`mobile/app/chat/[threadId].tsx`): library's `<KeyboardAvoidingView behavior="padding">` + `useKeyboardState()` replaces manual `Keyboard.addListener` / `paddingBottom: keyboardHeight` logic that was unreliable under Android 15+ edge-to-edge.
- Windows-only build prereqs (one-time per machine, documented in `Docs/debugs.md`): `HKLM\...\LongPathsEnabled=1`, ninja v1.12.1 swapped into Android SDK `cmake/3.22.1/bin`. Committed: `mobile/android/app/build.gradle` now passes `-DCMAKE_MAKE_PROGRAM=<sdk-ninja>` + `-DCMAKE_OBJECT_PATH_MAX=1024` on Windows.
- Verified on `P13_Blue_Max_Lite_2022`: composer pins flush above keyboard, no gap, no clipping across show/hide cycles.

### 2026-05-09 — Handoff: full day’s work + iOS / Mac verification checklist

Use this block to resume on **Mac** (sync repo, then validate **iOS** alongside Android).

**Migrations to run on any environment (API):**  
`npx prisma migrate deploy` — includes at least `20260508140000_user_preferred_locale`, `20260509120000_user_workshop_coords`, plus any older pending migrations.

**Feature / file map (what changed):**

| Area | Summary | Key paths |
|------|---------|-----------|
| Push locale | Notifications use **recipient** `User.preferredLocale` (`en` \| `ar-iq`); mobile syncs locale on change + bootstrap | `api/src/services/push-i18n.ts`, `api/src/routes/users.ts`, `mobile/lib/sync-preferred-locale.ts`, `mobile/lib/i18n.tsx`, `mobile/lib/bootstrap.ts`; call sites: `posts.ts`, `notify-shops.ts`, `chat.ts`, `socket/chat.ts`, `bids.ts` |
| Chat header | Subtitle uses **viewer** language (`t()` + taxonomy labels) | `mobile/app/chat/[threadId].tsx` |
| Shop signup | **District optional**; **address required**; `districtId: null` allowed on `PUT /users/me` | `api/src/routes/shops.ts`, `api/src/routes/users.ts`, `mobile/app/signup/shop-location.tsx`, `shop-area.tsx`, `mobile/app/shop/(tabs)/profile.tsx` |
| Arabic taxonomy | Repair/parts labels: e.g. بريكات، الگير، حداده الصدر، سمكري وصباغ | `mobile/lib/taxonomy-labels.ts` |
| Shop feed distance | Hidden for repair/parts; **shown only for TOWING** (pickup GPS vs shop) | `mobile/app/shop/(tabs)/index.tsx`; API distance prefers **`workshopLat/Lng`** then district (`api/src/services/feed-filter.ts`, `notify-shops.ts`) |
| Workshop GPS | Optional pin on **User**; signup + shop profile; towing notify uses pin if no district | `api/prisma/schema.prisma`, migration `20260509120000_user_workshop_coords`, `api/src/lib/workshop-coords.ts`, `mobile/lib/open-google-maps.ts`, shop profile + `signup/shop-location.tsx` |
| Maps UX | **Owner** viewing shop: directions via **pin** or **address search** (`openShopInGoogleMaps`). **Shop** in **accepted TOWING** chat: pickup card → `openGoogleMapsAt` | `mobile/app/owner/shop/[shopId].tsx`, `mobile/app/chat/[threadId].tsx` (thread `post` type includes `lat`, `lng`, `towingFrom*`) |

**iOS / Mac follow-ups (testing & parity):**

1. **Clone / pull** the same branch on Mac; `npm install` at repo root (workspaces).
2. **API:** `.env` with `DATABASE_URL`, `DIRECT_URL`; run migrations; restart API.
3. **Mobile:** `cd mobile && npx expo run:ios` (or EAS iOS build). **Do not** assume Expo Go parity for native Google — use dev client / release per `AGENTS.md` and `.cursor/rules/fixit-mobile-expo-google.mdc`.
4. **Location:** `expo-location` plugin in `mobile/app.json` sets `locationWhenInUsePermission` (Arabic copy). After prebuild, confirm **Info.plist** contains `NSLocationWhenInUseUsageDescription` if anything fails at runtime.
5. **Maps:** `Linking.openURL` to `https://www.google.com/maps/search/...` — verify on iOS device/simulator (opens Maps or browser).
6. **Regression smoke:** shop signup (no district + address + optional pin); owner opens shop profile → Maps; accept tow bid as shop → chat shows pickup card → Maps; push language with two accounts `en` vs `ar-iq`.

### 2026-05-09 — Optional workshop GPS (maps + towing distance)

- **Prisma** `User.workshopLat` / `User.workshopLng` (nullable) + migration `20260509120000_user_workshop_coords`.
- **API** `PUT /api/v1/users/me` and `POST/PATCH /api/v1/shops` accept optional paired coords (validated; both `null` clears pin). Shared zod helper `api/src/lib/workshop-coords.ts`.
- **Feed / pushes** `computeDistanceKmForPost` and towing shop notify use workshop pin when set, else district centroid.
- **Mobile** `open-google-maps.ts`; shop profile location modal + signup shop-location step: “Use current location”, preview, clear, open Maps; profile + owner shop detail show “Open in Google Maps” when a pin exists. i18n keys `workshopMapPin`, `workshopMapPinHint`, `useCurrentLocationForPin`, `clearWorkshopMapPin`, `openInGoogleMaps`, `locationPermissionNeeded`.

### 2026-05-08 — Shop signup: optional district, required address

- **API** (`POST /api/v1/shops`): `districtId` optional/nullable; `address` required (`min(1)`). `PUT /api/v1/users/me` accepts `districtId: null` to clear mapped area.
- **Mobile** shop location step no longer blocks continue without a district; validates non-empty address. Final create step re-checks address. Shop profile location editor: district optional with hint + “skip area” row in picker; address required on save. New i18n keys: `addressRequired`, `districtOptionalHint`, `districtOptionalPick`, `districtSkipOption`; `shopAddress` label no longer says optional.

### 2026-05-08 — Per-user push locale + localized chat header

- Added `User.preferredLocale` (`en` | `ar-iq`) with migration; `PUT /api/v1/users/me` accepts `preferredLocale`. Mobile syncs stored app language on change and on authenticated bootstrap (`sync-preferred-locale.ts`).
- Centralized FCM title/body strings in `api/src/services/push-i18n.ts` and wired all `sendPush` call sites (new bid, shop batch/towing, chat, bid accepted) to the **recipient’s** locale.
- Chat thread subtitle uses viewer language: service type via `t()`, categories via `repairCategoryLabel` / `partsCategoryLabel`, recomputed when locale changes (`mobile/app/chat/[threadId].tsx`).

### 2026-05-07 — Mobile sync and UX polish follow-ups

- Added chat load error state with tap-to-retry in `mobile/app/chat/[threadId].tsx` so message fetch failures are visible instead of silent empty threads.
- Added inbox ordering by latest activity (last message timestamp fallback to `updatedAt`) in `mobile/components/InboxThreadList.tsx` so active conversations float to the top.
- Improved unread consistency by emitting `mark-read` on chat focus and after inbound socket messages in `mobile/app/chat/[threadId].tsx`.
- Updated report action microcopy to target-specific labels (`reportThisPost`, `reportThisMessage`, `reportThisUser`) across post/chat overflow menus.
- Added consistent success feedback alerts for bid withdraw and explicit profile save flows (`location`, `served districts`, `categories`, `shop name`) in shop tabs.
- Added duplicate push-open guard in `mobile/app/_layout.tsx` to prevent rapid double navigation to the same chat thread from repeated notification handlers.
- Fixed bid re-place bug in `api/src/routes/bids.ts`: when a shop withdraws then bids again on the same post, the API now reactivates the existing withdrawn bid record (`WITHDRAWN` -> `PENDING`) instead of failing on unique `(postId, shopId)` constraint.
- Added end-job + mutual rating foundation:
  - Prisma schema/migration adds `ChatThread.completedAt/completedById`, per-user rating aggregates on `User`, and new `JobReview` model.
  - Chat API adds `POST /api/v1/threads/:id/complete` and `POST /api/v1/threads/:id/reviews`, plus active/completed thread filtering via `GET /api/v1/threads?state=...`.
  - Message send is blocked once a thread is completed (REST + Socket).
  - Mobile chat thread now supports complete-job action and post-completion star rating (optional comment), with composer disabled after completion.
  - Inbox now includes Active/Completed filters using the new thread state query.
- Fixed account-switch push bleed: `PUT /api/v1/users/me` now accepts `fcmToken: null`, clears that Expo/FCM token from any other user before assigning it to the current user, and `signOutFromApp` unregisters the token on the server before clearing the JWT.

### 2026-05-07 — Moderation stack foundation + admin ops surfaces

- Added moderation schema foundation: `Report`, `AuditLog`, `MediaAsset`, enforcement enums/reason fields, chat lock/hide fields, and migration `20260507130000_moderation_stack_foundation`.
- Added API moderation routes: public `POST /api/v1/reports`; admin reports queue/detail/claim/release/resolve; admin chat thread/message moderation; admin media hide/restore; admin audit log listing.
- Added moderation enforcement wiring: user ban reason/notes, post takedown reason/notes, audit writes for existing user/post admin actions, hidden-message masking, and locked-thread send blocking.
- Added media tracking + reliability hooks: post media sync to `MediaAsset`, media status checks on `/api/v1/media/:key`, and admin image proxy path for secure preview.
- Expanded admin dashboard with new pages/links for Reports, Chat, Media, and Audit; added report and moderation actions UI.
- Added mobile report UX entry points for post/user/message reporting and localized copy updates (EN + AR-IQ).

### 2026-04-14 — City + vehicle catalog (DB, market IQ)

- Prisma: `City`, `VehicleMake`, `VehicleMakeMarket`, `VehicleModel`, `VehicleModelMarket`, `VehicleModelYear` + migration `20260414140000_city_vehicle_catalog`.
- Seed imports `api/prisma/data/cities.json` and `api/prisma/data/vehicles-iq.json` (Iraq-focused makes/models with `yearFrom`/`yearTo`; per-market `sortOrder` puts common makes first, then alphabetical).
- Public API: `GET /api/v1/catalog/cities`, `/catalog/makes?market=IQ`, `/catalog/models?makeId=&market=IQ`, `/catalog/years?modelId=`.
- Mobile owner create-post: make → model → year from FixIt API (no NHTSA vPIC); Arabic labels when locale is `ar-iq`.
- Ops: after DB is reachable, run `npx prisma migrate deploy` and `npm run db:seed` (or equivalent) so production serves non-empty catalog and districts.

### 2026-04-14 — Owner post area sync + vehicle dropdowns

- Fixed owner create-post area loading: it now reads the logged-in user city/district from `/api/v1/users/me` and preselects a valid district instead of hardcoding Baghdad.
- Replaced free-text `carMake`, `carModel`, `carYear` inputs on owner create-post with searchable dropdown selectors.
- Integrated live vehicle dataset source from NHTSA vPIC:
  - makes: `GetMakesForVehicleType/car`
  - models: `GetModelsForMakeYear/make/{make}/modelyear/{year}`
  - years: selectable list (current year down to 1995, matching vPIC model-year support).
- Expanded Baghdad district seed set from a handful of entries to a full administrative neighborhood list (89 entries) so owner/shop area selection can cover all Baghdad zones.
- Added centroid pipeline for Baghdad neighborhoods:
  - `api/scripts/fetch-baghdad-centroids.ts` fetches per-neighborhood coordinates from Nominatim and writes `api/prisma/baghdad-centroids.json`.
  - `api/prisma/seed.ts` now loads that JSON and uses per-neighborhood coordinates when available (falls back to Baghdad center only when missing).
- Owner create-post area flow now always shows a post-level area selector (for repair/parts/towing), prefilled from profile district when available and still editable per post.
- Added district loading resilience on create-post: if profile city has no districts, it falls back to all districts and still keeps profile district selectable to avoid "Pick district" dead-end.
- Owner profile location UX improved: `City` opens city edit flow, while `District` and `Address` now open district selection directly (`/signup/owner-location`) using current profile city.

### 2026-04-10 — First-run language, location edit, category/city i18n, shop subscriptions

- First-run language screen (`/language-gate`) before auth; locale persisted; logged-in users auto-mark gate done.
- Owner can edit location via signup flows with `from=profile`; districts show `nameAr` in Arabic; cities localized.
- Repair/parts category chips and shop profile (including edit modal) use shared taxonomy labels (API values stay English).
- Shop profile: RevenueCat paywall + restore; shared `presentRevenueCatDashboardPaywall` helper.
- API: changing `city` without `districtId` clears the old district so the client must re-pick.

### 2026-04-10 — Mobile Google (dev client) + workflow hygiene

- Native Google Sign-In aligned with Firebase: `google-services.json`, Gradle `android/app/debug.keystore` vs `~/.android/debug.keystore` documented; `EXPO_PUBLIC_*` OAuth IDs synced to Firebase project `fixit-9191d`.
- Expo Go vs dev build clarified; `.cursor/rules/fixit-mobile-expo-google.mdc` + `AGENTS.md` + Cursor commands scaffolded for FixIt.
