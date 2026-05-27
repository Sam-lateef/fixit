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
- **Shop rating display:** Shops expose `rating` (avg stars) + `reviewCount` aggregates (computed from `JobReview`). Mobile now shows rating on shop profile (`ShopServiceOverview`) and on owner bid shop cards (when `reviewCount > 0`).
- **Bid schedule fields restored (shop):** `appointmentDate`/`appointmentTime` (repair/towing) and `deliveryDate`/`deliveryWindow` (parts) are wired again in shop bid create/edit/view flow and passed through route params from `shop/(tabs)/bids.tsx` to `shop/bid/[postId].tsx`.
- **Bid PUT clear semantics:** `appointmentDate`/`deliveryDate` accept `null` to clear (was: `undefined` = unchanged + no clear path). API: `api/src/routes/bids.ts` uses `.nullable().optional()` + `toNullableDate()`. Mobile sends explicit `null` on edit when picker is blank.
- **Public shop payload (`GET /shops/by-id/:id`):** user record now whitelisted to id/name/phone/city/address/workshopLat/lng/district. Sensitive fields (`fcmToken`, `preferredLocale`, `bannedAt`, `role`, etc.) no longer leak to other authenticated users. `ShopProfilePayload` already expected the smaller shape — change is server-side only.
- **`GET /posts/:id` authorization:** authenticated user must be the post owner OR a SHOP user. Blocks cross-owner enumeration by id while preserving the shop bidding flow.
- **`apiFetch` timeout:** 15s default via `AbortController`; new `ApiTimeoutError` distinguishable from generic network failures (`friendlyApiError → requestTimedOut`). Caller override via `timeoutMs`.
- **Bootstrap resilience:** `resolveInitialRoute` throws `BootstrapTransientError` on non-auth `GET /users/me` failure. `app/index.tsx` renders a retry / sign-out screen instead of bouncing the authenticated user to `/auth` on transient network errors.
- **Race-safe button handlers:** OTP verify, owner accept-bid, owner delete-post, shop bid submit, shop withdraw-bid all guarded against double-tap via `useRef`/state flags + `disabled` UI.
- **Full handoff + iOS checklist:** `docs/progress.md` (2026-05-09 Handoff) and `docs/chatSummaries.md` (2026-05-09 session).
