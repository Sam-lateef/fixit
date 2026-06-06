# Debug log — FixIt

**Open issues** at top; move solved entries down with **Resolution** and date.

## Open

### Shop-type signup redesign — ready to deploy (2026-05-28)

The 5-boolean shop grid (`offersRepair/Parts/Towing × servicesCars/Motorcycles`) has been collapsed into a single `ShopType` enum (`CAR | MOTORCYCLE | TOWING`) chosen at signup and immutable thereafter. The original 3-step staged rollout was collapsed into a **single deploy** after the 5 existing test shops were wiped from prod (no backfill needed — `Shop` table is empty).

- **DB + API (single migration `20260528100000_shop_type_enum`):**
  - `CREATE TYPE "ShopType"` + `ALTER TABLE "Shop" ADD COLUMN "shopType" NOT NULL` (no backfill — table empty).
  - `DROP COLUMN servicesCars`, `servicesMotorcycles`, `deliveryAvailable` in the same migration.
  - `api/src/routes/shops.ts` requires `shopType` on POST, forbids `shopType` / `offersTowing` changes on PUT, enforces `≥1 of repair/parts` for CAR / MOTORCYCLE shops.
  - `api/src/services/feed-filter.ts` + `notify-shops.ts` branch on `shopType` exclusively (no null fallback, no legacy boolean reads). Prisma `where` clauses for push notifications now filter by `shopType: 'CAR' | 'MOTORCYCLE' | 'TOWING'`.
  - Unit tests + `tsc --noEmit` clean.
- **Mobile:**
  - NEW `mobile/app/signup/shop-type.tsx` (3 cards Car / Motorcycle / Towing).
  - `mobile/app/auth/account-type.tsx` TOWING fast-path deleted; SHOP always lands on `/signup/shop-type`.
  - `mobile/app/signup/shop.tsx` → `shop-services.tsx`, narrowed to Repair / Parts multi-select with ≥1 required. Vehicle toggle, towing card, and `deliveryAvailable` switch removed.
  - `mobile/app/signup/shop-makes.tsx` auto-skips when `shopType !== CAR` and requires ≥1 make for CAR.
  - `mobile/app/signup/shop-parts-cats.tsx` no longer collects `deliveryAvailable` (field is gone).
  - `mobile/app/signup/shop-area.tsx` sends `shopType` on `POST /api/v1/shops` and stops sending the legacy booleans.
  - `mobile/lib/bootstrap.ts` + `mobile/app/shop/(tabs)/_layout.tsx` redirect missing-shop SHOP users to `/signup/shop-type`.
  - `mobile/app/shop/(tabs)/profile.tsx` settings card shows a read-only "Shop type" row, editable `offersRepair` / `offersParts` (CAR/MOTO only) with a client-side ≥1 guard, and an editable `partsNationwide` (when `offersParts=true`). Dead `offersTowing` / `servicesMotorcycles` / `deliveryAvailable` switches removed.
  - `mobile/components/shop/ShopServiceOverview.tsx` only renders the car-makes section for CAR shops.
- **Deploy order:** fly-deploy the API (migration runs automatically), then build + ship the mobile APK. Old APKs cannot create shops anymore (API rejects payloads missing `shopType`), so they need to be replaced before any new shop can sign up.

## Resolved

### Chat keyboard overlap on Android edge-to-edge — fixed 2026-05-28

- **Symptom (Android 15+):** In `mobile/app/chat/[threadId].tsx`, when the soft keyboard opened, the composer (TextInput + Send button) was partially hidden behind the keyboard. Hide → re-show cycles also left a phantom gap between the message list and the keyboard. Reproduced repeatedly on `P13_Blue_Max_Lite_2022`.
- **Root cause:** `mobile/app.json` enables `edgeToEdgeEnabled: true`, which on Android 15+ makes `windowSoftInputMode=adjustResize` effectively a **no-op** — the system does **not** shrink the window when the IME opens. RN's stock `KeyboardAvoidingView` cannot measure the keyboard frame correctly in this mode, and manual `Keyboard.addListener` + `paddingBottom` produced inconsistent offsets across show/hide cycles (timing of `keyboardDidShow` vs layout pass varies).
- **Resolution:**
  - Added **`react-native-keyboard-controller@1.18.5`** via `npx expo install react-native-keyboard-controller` (SDK 54-compatible). `react-native-reanimated` was already a dep.
  - Wrapped the app root with `<KeyboardProvider>` in `mobile/app/_layout.tsx`. The provider mounts a native window-insets listener and exposes a synchronized keyboard frame to JS.
  - Replaced the chat screen's outer `View` + manual `paddingBottom: keyboardHeight` with the library's `<KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0}>`. Removed the manual `Keyboard.addListener` block. Kept a single `useKeyboardState().isVisible` bit only to drop the safe-area bottom inset from the composer while the keyboard already covers the gesture-bar area.
- **Native rebuild required** (library ships native code). The rebuild surfaced a Windows MAX_PATH issue — see next entry.

### Windows MAX_PATH on `react-native-keyboard-controller` build — fixed 2026-05-28

- **Symptom:** `npx expo run:android` on Windows died at `:app:buildCMakeDebug[armeabi-v7a]` with `ninja: error: Stat(.../reactnativekeyboardcontrollerJSI-generated.cpp.o): Filename longer than 260 characters`. Generated object path was ~373 chars (172-char dir + 170-char filename).
- **Cause (three layers, all needed):**
  1. Windows long paths were **not** enabled — `HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled = 0`.
  2. The **ninja v1.10.2** bundled with Android SDK `cmake/3.22.1` does **not** use the `\\?\` long-path prefix when calling Win32 file APIs, so its `Stat()` still fails at 260 chars even with `LongPathsEnabled=1`.
  3. CMake's own `CMAKE_OBJECT_PATH_MAX` defaults to **250**, so it warns + truncates before ninja even sees the path.
- **Resolution (canonical fix per [keyboard-controller troubleshooting docs](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/troubleshooting)):**
  1. **Registry (one-time, machine-wide, requires admin):** `Set-ItemProperty -Path HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem -Name LongPathsEnabled -Value 1 -Type DWord`.
  2. **Ninja swap (one-time, per Android SDK install):** downloaded `ninja-win.zip` v1.12.1 from `github.com/ninja-build/ninja/releases` and replaced `%LOCALAPPDATA%\Android\Sdk\cmake\3.22.1\bin\ninja.exe`. Original kept as `ninja-1.10.bak.exe`.
  3. **`mobile/android/app/build.gradle`:** added an `externalNativeBuild.cmake.arguments` block under `defaultConfig`:
     - `-DCMAKE_MAKE_PROGRAM=<sdk>/cmake/3.22.1/bin/ninja.exe` (pin all `:configureCMake*` calls to the long-path-aware ninja).
     - `-DCMAKE_OBJECT_PATH_MAX=1024` (raise CMake's internal cap).
     - Branched on `Os.isFamily(Os.FAMILY_WINDOWS)` only for the filename so Mac/Linux/EAS keep using `ninja`.
- **Result:** `BUILD SUCCESSFUL in 2m 6s`. APK installs + launches on device.
- **Important caveat — the `build.gradle` change is NOT in git.** The whole `mobile/android/` tree is `.gitignore`d (line 41 of `mobile/.gitignore`), so the CMake-arguments block lives only in the local working copy. It survives `npx expo run:android` (incremental prebuild does not overwrite existing files), but a `npx expo prebuild --clean` (or a fresh `mobile/android/` checkout) wipes it. If we want this persistent on Windows we'd have to express it as an Expo config plugin or a `withGradleProperties` mod. For now keep `--clean` off the menu on this machine.
- **EAS is unaffected** — Linux runners regenerate `mobile/android/` from `app.json` + plugins, and there's no MAX_PATH issue on Linux. The `softwareKeyboardLayoutMode: "resize"` in `app.json` is the persistent half — that produces `android:windowSoftInputMode="adjustResize"` in the EAS-generated manifest, which is what the keyboard-controller library needs.
- **If you ever upgrade Android SDK CMake:** the hard-coded `3.22.1` in `build.gradle` may need bumping; update `cmakeDir` to match.

### Windows local Gradle release build (monorepo) — fixed 2026-05-28

- **Symptom:** `cd mobile/android && ./gradlew assembleRelease` on Windows failed at `:app:createBundleReleaseJsAndAssets` with
  `Error: Unable to resolve module ./../node_modules/expo-router/entry.js from D:\Dev\FixIt/.` (then later, after partial fixes, `./index.js` from the same `D:\Dev\FixIt/.` root, and finally `@react-native/virtualized-lists` not found).
- **Why it happened (three combined factors):**
  1. **Windows-only RN Gradle plugin behaviour.** `com.facebook.react.utils.Os.cliPath()` returns a *relative* path on Windows (vs absolute on Linux/macOS). With `npm workspaces` hoisting `react-native` and `expo-router` to `D:\Dev\FixIt\node_modules\…`, the `--entry-file` Gradle passes to `@expo/cli export:embed` becomes `..\node_modules\expo-router\entry.js` instead of an absolute path.
  2. **`@expo/metro-config` auto-walks to the workspace root.** `getMetroServerRoot()` (in `@expo/config/build/paths/paths.js`) treats the npm-workspaces root `D:\Dev\FixIt` as Metro's server root, so the relative `..\…` traverses *out* of the project and the entry can't be resolved.
  3. **Hierarchical lookup off.** A first-pass `metro.config.js` set `disableHierarchicalLookup: true`. That stopped Metro from walking into `node_modules/react-native/node_modules/`, where npm had nested `@react-native/virtualized-lists` because of a peer-dep version mismatch.
- **EAS / Linux is unaffected.** On Linux/macOS `cliPath()` returns an absolute path, so neither (1) nor (2) bites. This is strictly a Windows × monorepo combo issue.
- **Resolution (committed; safe for EAS):**
  - `mobile/metro.config.js` (new): monorepo config — `projectRoot = __dirname`, `watchFolders = [workspaceRoot]`, `nodeModulesPaths = [mobile/node_modules, workspaceRoot/node_modules]`. Hierarchical lookup left **enabled** so Metro can resolve `@react-native/virtualized-lists` from `node_modules/react-native/node_modules/`.
  - `mobile/index.js` (new) + `mobile/package.json#main = "index.js"`: thin shim that `import "expo-router/entry";`. Keeps the Gradle-passed entry path *inside* `mobile/` so the relative-path computation never leaves the workspace folder, even on Windows.
  - **Build invocation:** must export `EXPO_NO_METRO_WORKSPACE_ROOT=1` before `./gradlew assembleRelease` so `@expo/metro-config` treats `mobile/` as the Metro server root instead of walking up to `D:\Dev\FixIt`. Linux EAS builds don't need this and ignore it.
- **Result:** `mobile/android/app/build/outputs/apk/release/app-release.apk` (117.4 MB) builds clean on Windows. APK signs with the local `debug.keystore` (SHA1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`, already registered in Firebase for `com.fixitiq.app`), so native Google Sign-In works in the release variant.
- **Caveat for sideload:** this APK's signature differs from any EAS-built APK. A device with a previous EAS install must uninstall first before installing this local APK (Android refuses cross-signature upgrades).


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
