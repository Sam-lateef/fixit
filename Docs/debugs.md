# Debug log — FixIt

**Open issues** at top; move solved entries down with **Resolution** and date.

## Open

- (none — add when something regresses)

## Resolved

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
