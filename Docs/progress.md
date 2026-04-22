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
