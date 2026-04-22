# Fix It — build order (working checklist)

Optional: **`EXPO_PUBLIC_DEV_NAV_HUB=true`** in `mobile/.env` opens the dev link hub (`app/dev/index.tsx`). **Leave false** for normal testing — app starts on the real phone screen; in `__DEV__` the OTP bypass panel shows on `auth/number` by default (opt out with `EXPO_PUBLIC_DEV_MOCK_AUTH=false`).

## Phase 1 — Auth & bootstrap (done / ongoing)

- [x] API JWT auth, send-otp / verify-otp
- [x] Mobile bootstrap → owner vs shop vs signup
- [x] Dev navigation hub (no login)
- [x] **Dev session API** `POST /api/v1/dev/session` (OWNER/SHOP JWT) + dev hub buttons
- [x] **Shop paywall bypass** in dev (`EXPO_PUBLIC_DEV_SKIP_SHOP_PAYWALL`)
- [ ] Infobip WhatsApp OTP (paused — billing)

## Phase 2 — Owner: posts

- [x] API: create/list/delete post, 48h expiry job
- [x] Mobile: **create post** (repair/parts/towing + optional photos) + owner home list
- [ ] Push: new bid on post (optional MVP+)

## Phase 3 — Shop: feed & bids

- [x] API: feed filter algorithm + place/edit/withdraw bid
- [x] Mobile: feed, bid screen, accept → chat
- [x] Mobile: **Shop bids tab** (GET /api/v1/bids/mine) — status badges, edit, withdraw

## Phase 4 — Coordination

- [x] API: Socket.io + REST chat (threads, messages)
- [x] Mobile: **inbox thread list** + **chat screen** (REST; realtime socket optional)
- [x] InboxThreadList shows correct counterparty (owner sees shop name, shop sees post description)

## Phase 5 — Media

- [x] API: upload local fallback (R2 optional when configured)
- [x] Mobile: gallery → post photos via `expo-image-picker`

## Phase 6 — Profiles

- [x] Mobile: **Owner profile** — shows phone, name (editable), city/district, language, logout
- [x] Mobile: **Shop profile** — shows shop name, services, location, rating, bidsWon, language, logout

## Phase 7 — Error handling & stability

- [x] All load() callbacks wrapped in try/catch (owner home, shop feed, chat, inbox)
- [x] Dev shop categories updated to match common post categories
- [x] E2E verified: dev login → post → bid → accept → chat → messages

## Phase 8 — UI polish (done)

- [x] **Owner bottom tabs + center FAB** — raised circular "+" button for New Post
- [x] **Shop signup 6-step wizard** — services → makes/years → repair cats → parts cats → location → service area
- [x] **Shop feed enhancements** — filter tabs (All/Repair/Parts/Towing), colored service tags, distance pill, car info, bid count, time left
- [x] **Place bid enhancements** — post summary card, estimated time (hrs/days), appointment date/time, 500-char message, "can adjust" hint
- [x] **Chat header** — back button, counterparty name, post context (service · category · car), "Accepted" badge
- [x] **Owner home card polish** — delete button, service + category tag, green dot + time left, Best bid (green card + pill), Accept + Message buttons
- [x] **Profile screens** — dark green header with avatar initials, settings cards with chevrons, privacy/terms links

## Phase 9 — Remaining

- [ ] i18n / RTL hardening
- [ ] RevenueCat / subscription when ready
- [ ] Push notifications (Firebase)
- [ ] Socket.io realtime chat (currently REST polling)
- [ ] Infobip WhatsApp OTP (paused — billing)

---

_Updated 2026-04-07 — UI polish pass complete. All 7 priority items implemented. Zero TS errors._
