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

### 2026-06-08 — Vehicle catalog expansion: +318 IQ models across 29 brands

- User supplied a 481-row reference list (29 brands). Diff against prod showed 0 missing brands but **318 missing models**.
- Generated additions with smart per-model year defaults (default 2000–2026; 2020+ for new EVs/PHEVs like BYD Han DM-i, Yangwang U8/U9, BMW iX/i4/i5/i7, Audi e-tron, Mercedes EQ series, Land Cruiser 300/250, Prado 250 etc.; capped windows on discontinued classics like Mark X 1996–2019, Tiida 2004–2018, RX-8 2002–2012, etc.). Arabic names left null for the new rows — UI falls back to English; can be added later.
- New helper: `api/scripts/reseed-catalog.mjs` — plain-ESM runner that imports the built `dist/lib/catalog-json-seed.js` so it works in the pruned prod image (no tsx). Idempotent; safe to re-run.
- Deploy: API release `01KTKQENAF80BPKWYSZPED9D4G`, then `fly ssh console -C 'node /repo/api/scripts/reseed-catalog.mjs'` (6.9 s). Live catalog now 79 brands / **695 models** (up from 377). Verified per-brand counts against expected via `/api/v1/catalog/models?makeId=...&market=IQ`.

---

### 2026-06-08 — Phone copy cleanup: drop Turkey reference, fix English-leaking error on /auth/number

- Removed every user-visible Turkey reference from the phone-validation copy (mobile `phoneInvalidFormat` en + ar, API `e164WhatsAppOtpHint`, `shops` zod message). `+90` numbers still validate on the backend (testing/travel) but are no longer surfaced.
- Fixed `mobile/app/auth/number.tsx:89` which had a hardcoded English `setErr(...)` — Arabic users were always seeing English on that one screen. Now routes through `t("phoneInvalidFormat")`.
- Deploy: API release `01KTKNTSD2HCM08ZTJCGQ1DX1E`. Mobile ships with next APK.

---

### 2026-06-08 — Towing + Motorcycle post: drop spurious "make/model/year" requirement

- Owner-side TOWING posts on a tuktuk/motor were blocked by a validation that asked for `motorcycleDetails` ("Enter make / model / year") even though that input is hidden for towing — mirroring the existing CAR + TOWING behaviour which collects nothing of the kind.
- `api/src/routes/posts.ts`: `superRefine` skips the motorcycleDetails requirement when `serviceType === "TOWING"`.
- `mobile/components/OwnerPostEditor.tsx`: client-side validation gated on `serviceType !== "TOWING"`; both create body and edit patch only set `motorcycleDetails` when the trimmed value is non-empty.
- Deploy: API release `01KTKNFD70DC3ERBQM9WYH24KM`. Mobile change ships with next APK.

---

### 2026-06-08 — API hot-fix: Prisma pool starvation + zombie flycast connections

- **Incident:** Users reported "app is so slow, screens time out, sign in hangs" the day after the 2026-06-06 phase-1 polish deploy. Live Fly log tail confirmed `/users/me` taking **26 s**, `/posts/mine` **4 s**, media GETs **91 s**, and a `PUT /users/me` failing with `PrismaClientKnownRequestError P2028` (interactive transaction timed out at 13.8 s of a 5 s budget). The cold-started second machine handled identical endpoints in 35–60 ms — proving the code/DB were fine, but the long-running first machine's Prisma pool was wedged on zombie flycast TCP connections.
- **First aid:** `fly machine restart 2879095b66e758 --app fixit-api` — instant relief.
- **Permanent fixes (API v52, deploy `01KTKHZ9D8BY981AP4HMD0SBMQ`):**
  - `api/src/db/prisma.ts`: build `datasourceUrl` with `connection_limit=10`, `pool_timeout=20`, **`socket_timeout=30`** (kills zombies before OS-level TCP timeout), `connect_timeout=10`. Each param applied only if not already in `DATABASE_URL` so Fly secret can override.
  - `api/src/routes/districts.ts` + `api/src/routes/catalog.ts`: removed per-request `count()` bootstrap calls; moved to one-shot `bootstrapDistrictsIfEmpty()` / `bootstrapCatalogIfEmpty()` invoked from `buildApp()`. Added `Set<string>` cache + single-flight `Map` for the per-city defensive lazy seed so concurrent first-requests for the same new city don't all upsert.
  - `api/src/app.ts`: wires the two bootstrap calls at the end of `buildApp()` in parallel.
  - `fly.toml`: `min_machines_running = 1 → 2` so both iad machines stay warm and one wedged pool can't choke all traffic.
- **Verification:** post-deploy probe — `/health` 0.53 s, `/public/config` 0.41 s, `/districts?city=Baghdad` 0.50 s, `/catalog/makes` 0.49 s end-to-end from Iraq (≈160 ms TCP connect baseline; server-side ~5–30 ms). Both Fly machines `started + 1/1 passing`. Full incident write-up in `Docs/debugs.md`.
- **Outstanding TODO:** revoke unused GCP IAM service-account key `376b7b2005b88728b6d670788e5f535850e0499c` from earlier session (still pending).

### 2026-06-06 — SHA correction + rebuild (versionCode 6) after DEVELOPER_ERROR

- **Bug:** the SHA-1 registered in the prior step (`b9617e49e6210bf5602812f70a4b79b5dfaea049`) was **transcription-garbled** — 6 bytes off from the real Play App Signing key. First install via Play Internal Testing opt-in link returned `DEVELOPER_ERROR` on Google Sign-In. Confirmed by reading the live SHA-1 from Play Console → Setup → App integrity → Settings, which is `b9617e49e621dbf56d2812f70a407905cfae4049`. Wrong vs right diff: positions 7/9/14/16/17/19 (`0B↔DB`, `60↔6D`, `4B↔40`, `B5↔05`, `DF↔CF`, `A0↔40`) — every error is a D/0 or C/D confusion, classic OCR/transcription pattern.
- **Fix in Firebase:** added correct SHA `B9:61:7E:49:E6:21:DB:F5:6D:28:12:F7:0A:40:79:05:CF:AE:40:49` to `com.fixitiq.app` (Firebase auto-created OAuth client `925833254957-f1jei1u5lq951qtflg72c5gkci7ej4ur.apps.googleusercontent.com`), then deleted the phantom SHA + its OAuth client. Re-downloaded `google-services.json` via the same `GetAndroidAppConfig` RPC interception (base64 payload) and committed (`0678e90`).
- **Rebuild + resubmit:** EAS production build `d7deb0d5-a2ea-466f-b05d-f9c534e28bcf`, versionCode auto-incremented 5 → **6**, finished in 21m05s. Submission `9da08e4a-bffe-4b0a-b7f6-b592b9717e9f` landed on the existing Internal Testing 1.0.0 draft. AAB: `https://expo.dev/artifacts/eas/...` (see EAS).
- **Lesson:** never trust a user-pasted SHA. Always cross-check with Play Console → App integrity (Play App Signing) or `keytool -list -v -keystore <ks>` for upload keys before registering. Cheapest verification: paste the SHA into Firebase Console and immediately read it back via a JS extractor to confirm normalization matches the source.
- **Cleanup TODO:** revoke unused SA key `376b7b2005b88728b6d670788e5f535850e0499c` (still pending from earlier).

### 2026-06-06 — First AAB pushed to Play Internal Testing (versionCode 5) [SUPERSEDED — see entry above]

- **Play App Signing SHA-1** `B9:61:7E:49:E6:21:0B:F5:60:28:12:F7:0A:4B:79:B5:DF:AE:A0:49` registered against the `com.fixitiq.app` Android app in Firebase project `fixit-9191d`. Without this, native Google Sign-In would throw `DEVELOPER_ERROR` on devices that install from Play (Play re-signs every AAB with the app-signing key — that SHA must be present in `google-services.json` so `@react-native-google-signin` can find a matching OAuth client at runtime).
- **`mobile/google-services.json`** regenerated from Firebase (3 SHA-1 entries for `com.fixitiq.app` now: EAS upload keystore `544fa9…`, Windows local debug `5e8f16…`, Play app-signing `b9617e…`). New OAuth client `925833254957-jjq508juc2829h50jjm1ti9f6mcj985e.apps.googleusercontent.com` added by Firebase automatically. Commit `353723c`.
- **EAS production AAB** queued from commit `353723c` → build `686c2f49-4c7a-4561-a889-e679360ef9eb`, versionCode auto-incremented 4 → **5**, signed with EAS-managed upload keystore `Build Credentials w6qjn9JQjh`. Build duration ~20 min. AAB: `https://expo.dev/artifacts/eas/dTTfW3s4V1zTyrBch2UQPn.aab`.
- **`eas submit` wired** (`9c9be02`): `submit.production.android` now has `serviceAccountKeyPath: ./play-service-account.json` + `track: internal`. Reuses the existing `firebase-adminsdk-fbsvc@fixit-9191d.iam.gserviceaccount.com` service account, which already had Admin (all permissions) on the Fix It Play Console app — so no new SA or permission grants were needed. The JSON key itself lives only locally and is gitignored (`mobile/.gitignore` line 45). Each dev regenerates a key from Firebase Console → Service accounts when needed.
- **Submission `ec5f5278-e3e0-4ad9-b0a6-b1b8916a949e`** completed cleanly via `eas submit --platform android --profile production --id 686c2f49 --non-interactive --wait`. AAB landed on the existing Internal Testing draft (release 1.0.0, versionCode 5).
- **Manual follow-up** in Play Console UI (not blockable by EAS): (1) Internal testing → Testers → add an email list (or a Google Group), (2) Edit release → Review → Start rollout to Internal testing. Play then emails opt-in links to each tester.
- **Cleanup TODO:** revoke unused SA key `376b7b2005b88728b6d670788e5f535850e0499c` in GCP IAM (created during a `Generate new private key` retry when the first response capture truncated). Low risk — the key was never persisted to disk.

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
