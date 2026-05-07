# Technical specifications — FixIt

**Canonical detail:** `docs/fixit_implementation_guide (1).md` (stack, Prisma, routes, flows, env vars).

**Stack (summary):**

- Mobile: Expo / React Native, Expo Router, Firebase Auth, `@react-native-google-signin/google-signin` on dev builds, `expo-auth-session` in Expo Go only.
- Backend: Node API (see repo `api/` if present), Prisma, Fly.io deployment notes in project docs when added.

**Keep this file short:** record **deltas** only — what changed vs the implementation guide and *why* (link to `docs/decisions.md` when useful).

## Recent deltas (2026-05)

- **User** may have `preferredLocale` (`en` \| `ar-iq`), `workshopLat`/`workshopLng` (optional). Push copy uses recipient locale; FCM strings in `api/src/services/push-i18n.ts`.
- **Shop create:** `districtId` optional/null; `address` required. **`PUT /users/me`** accepts `districtId: null` and paired `workshopLat`/`workshopLng` (or both `null` to clear pin).
- **Feed distance:** Shop app hides km for non-towing posts; towing uses post pickup coords vs shop pin (preferred) or district centroid.
- **Maps:** Mobile opens Google Maps via HTTPS search URLs; owner shop screen uses pin-first then address search (`mobile/lib/open-google-maps.ts`). Towing pickup in chat exposed on thread `post` (full Prisma row on `GET /threads/:id/messages`).
- **Full handoff + iOS checklist:** `docs/progress.md` (2026-05-09 Handoff) and `docs/chatSummaries.md` (2026-05-09 session).
