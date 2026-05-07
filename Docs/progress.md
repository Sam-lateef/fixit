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
