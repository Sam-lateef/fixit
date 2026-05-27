# Debug log — FixIt

**Open issues** at top; move solved entries down with **Resolution** and date.

## Open

## Resolved

### Pre-ship audit fixes — batch (2026-05)

- **Symptom:** Pre-ship audit surfaced ~20 distinct issues across mobile + API: silent error swallowing, race conditions on critical button handlers, PII leak in shop public profile, render-time navigation calls, missing API timeouts, signup-wizard JSON.parse crash risk, bid date fields not clearable, chat socket reconnect churn, etc.
- **Fixes (single batch):**
  - `mobile/lib/bootstrap.ts`: introduced `BootstrapTransientError`; `index.tsx` now renders a retry / sign-out screen on network failures instead of dumping the user to `/auth` with a valid token.
  - `mobile/lib/api.ts`: 15s default `AbortController` timeout, new `ApiTimeoutError` surfaced via `friendlyApiError → requestTimedOut`. Callers can override via `timeoutMs`.
  - Double-tap guards added: OTP verify (`inFlightRef`), owner accept-bid + delete-post (`acceptingBidId` / `deletingPostId`), bid submit (`submitInFlightRef`), shop withdraw-bid (`withdrawingBidId`).
  - `mobile/lib/signup-wizard-data.ts`: safe `parseSignupWizardData` helper. All 6 signup-wizard screens wrapped (was `JSON.parse(raw.data)` with crash risk on malformed deep links).
  - `api/src/routes/shops.ts` `GET /api/v1/shops/by-id/:shopId` now whitelists user fields (id/name/phone/city/address/workshopLat/lng/district) — no more `fcmToken`/`preferredLocale`/`bannedAt`/`role` leakage to other authenticated users.
  - `router.back()`/`router.replace()` moved out of render and into `useEffect` in `auth/otp.tsx`, `report.tsx`, `chat/[threadId].tsx`, `shop/bid/[postId].tsx`.
  - `api/src/routes/bids.ts` `PUT /api/v1/bids/:id`: schema now `.nullable().optional()` and `toNullableDate()` helper passes `null` through to Prisma so cleared date fields actually clear in DB. Mobile sends explicit `null` on edit when picker is empty.
  - Chat socket `useEffect` deps reduced to `[threadId]`; `me` and `meta.isCompleted` read via refs (no more reconnect on every load).
  - Chat `send()`: 6s socket ack timeout falls back to REST; REST errors surfaced via `setLoadError` instead of `catch {}`. Draft restored on failure.
  - Silent error swallows replaced with visible state: `mobile/components/InboxThreadList.tsx`, `mobile/app/shop/(tabs)/bids.tsx`, `mobile/app/owner/(tabs)/profile.tsx` (banner). Owner shop view (`owner/shop/[shopId].tsx`) now shows "invalid shop" instead of infinite spinner.
  - Owner profile name/phone field overwrite during edit: `nameFocusedRef`/`phoneFocusedRef` block `load()` from stomping mid-edit values. Redundant sync `useEffect` removed.
  - `mobile/app/shop/(tabs)/index.tsx` `hoursLeft` switched to floor minutes + `<1h` sentinel (was `Math.round` mislabeling 30–59 min as `1h` and 0–29 min as `0h`).
  - Shop tab bar now respects `useSafeAreaInsets().bottom` to clear iPhone home indicator (mirrors owner tabs).
  - `mobile/app/+not-found.tsx`: brand theme + i18n (`notFoundTitle` / `notFoundBody` / `goHome`).
  - `api/src/routes/posts.ts` `GET /posts/:id`: gated on owner OR SHOP userType; OWNERs can no longer enumerate other owners' posts by id. All `z.parse(request.params)` calls in `posts.ts`, `bids.ts`, `chat.ts`, `admin/chat.ts` replaced with `safeParse` so malformed params return 400 instead of unhandled-rejection 500.
  - Bid date picker: 45-day window now seeded from local `new Date(yyyy, mm, dd)` instead of UTC, so the first option matches the user's device "today" in any timezone.
  - `auth/index.tsx` `handleGoogleSignedIn` wrapped in try/catch; errors now show via `setErr` instead of failing silently.
  - Removed unused `_CATEGORY_LABEL` constant from `mobile/app/shop/(tabs)/index.tsx`. Kept `+html.tsx`, `signup/shop-category.tsx`, and `auth/number.tsx` (web-only / wizard-future / dev-only flows respectively).
- **Notes:** No schema migrations needed. Files touched: 25 mobile + 4 API + strings + docs. Lint clean. Existing tests still pass; the only new test path (motorcycle filter) was added in the previous session.

### Motorcycle requests shown to non-moto shops (2026-05)

- **Symptom:** Shops with `servicesMotorcycles=false` still saw some motorcycle posts in feed browsing.
- **Cause:** API `buildMoreFeedEntries` / `moreFeedEntriesInShopCity` did not enforce vehicle-type gates; only the strict matched feed path did.
- **Fix:** Unified vehicle-type gate in `api/src/services/feed-filter.ts` and applied it to matched + more-city + national-more pools. Added regression test in `api/src/services/feed-filter.test.ts`.

### Arabic chat bubble clips last glyph/word (thread UI) — Android 15+ (2026-05)

- **Symptom:** Chat thread Arabic text clipped last char/word on some Samsung/Android 16 devices; notifications/API correct.
- **Root cause:** RN Android 15+ advance width vs glyph ink ([#53286](https://github.com/facebook/react-native/issues/53286)).
- **Resolution (shipped, no further QA):** keep baseline-only mitigations — (1) `patch-package` `patches/react-native+0.81.5.patch` ([#54721](https://github.com/facebook/react-native/pull/54721)) and (2) long-press **Copy** on raw body. Trailing-space and extra `paddingEnd` display workarounds were reverted to avoid cross-device Android regressions. EAS: root `postinstall` patches hoisted `react-native`; `mobile/scripts/postinstall-patch.js` skips when not local. Optional layout debug: `EXPO_PUBLIC_DEBUG_CHAT_BUBBLE_LAYOUT=true` in `.env` only.


### Owner create-post shows "Pick district" after profile location set (2026-04)

- **Cause:** create-post district loader was fixed to `city=Baghdad` and did not bootstrap from logged-in owner profile (`/users/me`), so district state could be empty/invalid for non-Baghdad profile locations.
- **Fix:** create-post now loads user city + district first, fetches district list for that city, and preselects a valid district.

### Baghdad centroid generation rate-limited by Nominatim (2026-04)

- **Cause:** bulk geocoding many Baghdad neighborhood names can trigger HTTP 429 from Nominatim.
- **Fix:** added retry + backoff in `api/scripts/fetch-baghdad-centroids.ts` and made seeding resilient by reading `api/prisma/baghdad-centroids.json` with fallback center point for any unresolved neighborhoods.

### Owner area selection reverts on post create (2026-04)

- **Cause:** create-post district loader effect re-ran when `districtId` changed and re-applied profile district, overriding user changes in the same form.
- **Fix:** prefill profile district only once; preserve current in-form selection if still valid. Also improved owner-location fallback to load all districts when city-scoped result is empty.

- **Follow-up cause:** two overlapping `loadDistricts` requests (effect re-ran when prefill state flipped); the slower request could finish last with a stale closure and apply profile district again.
- **Fix:** use `useRef` for one-shot prefill (no second effect run) so stale completions cannot overwrite the user’s pick.

### Android `DEVELOPER_ERROR` / Google Sign-In (2026-04)

- **Cause:** Firebase SHA-1 registered for `~/.android/debug.keystore` while Gradle signed APK with `mobile/android/app/debug.keystore` (different certs).
- **Fix:** Register correct SHA-1 for the keystore Gradle uses OR copy align keystores; re-download `google-services.json`; `npx expo prebuild --platform android` when JSON changes. Script: `mobile/scripts/print-android-debug-sha1.ps1` (reads `android/app/debug.keystore` first).

### Expo Go vs `auth.expo.io` after native Google work (2026-04)

- **Cause:** Opening app in **Expo Go** uses proxy OAuth, not native Google.
- **Fix:** Test Google with **`npx expo run:android`** dev client. See `AGENTS.md` §3.
