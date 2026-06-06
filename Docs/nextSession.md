# Next Session — Handoff Brief

> Overwritten by `/end` each session. Last updated: **2026-05-27 on Windows** (pre-ship audit batch + API deploy + Android preview build queued).

---

## 2026-05-27 — Latest Windows session → Mac handoff

**Read this section first. The 2026-05-22 brief below is older and largely still valid for items not yet ticked.**

### What landed today (8 new commits, all pushed — `origin/master` tip = `e2e78da`)

| Commit | What |
|--------|------|
| `2e04ca6` | **Pre-ship audit batch (37 files)** — see `Docs/debugs.md` + `Docs/specs.md` for the full list. Headline: bootstrap retry screen (no more /auth dump on flaky network), 15s `apiFetch` timeout, double-tap race guards on OTP / acceptBid / deletePost / bid submit / withdraw, safe JSON parse on signup wizard, PII pruned from `GET /shops/by-id/:id`, `GET /posts/:id` now gated on owner-or-SHOP, `PUT /bids/:id` accepts `null` to clear date fields, all route params switched to `zod.safeParse()`, render-time `router.back/replace` moved into useEffect, chat socket no longer reconnects on me/meta changes + ack timeout + REST fallback, silent load errors surfaced, owner profile no longer overwrites mid-edit fields, `hoursLeft` uses `Math.floor` + `<1h` sentinel, shop tab bar respects safe-area inset, `+not-found` branded, dead code removed, new i18n keys in `mobile/lib/strings.ts`. |
| `d8cee34` | Root `postinstall` now uses `scripts/postinstall-patch.js` guard — skips `patch-package` when not installed (was crashing Fly Docker builds). |
| `67dfcde` | Dockerfile: `COPY scripts ./scripts` before `npm ci` so the guard above resolves. |
| `2c50f05` | Dockerfile: `--ignore-scripts` on the rollup linux-x64 install (mobile postinstall is irrelevant for API image). |
| `e2e78da` | Dockerfile: `--ignore-scripts` on `npm prune --omit=dev` (same reason). |

Plus 3 commits from the prior Windows session that also went up in this push: `7c3e375`, `a2e3731`, `3ea305b` (RN Android 15 text-clip patch + EAS hoist fixes).

### State of the world right now

- **API:** Deployed to Fly. Image `01KSM6PPSBDD4BQEMAZYW0DGB6` (248 MB), both machines healthy, `https://fixit-api.fly.dev/health` → `{"ok":true}`. **No DB migration needed** (bid date columns were already nullable in Prisma).
- **EAS Android preview build:** Queued from Windows ~10:56 local. ID `a8f7b904-f975-429b-8cb8-830ff926ef5e`. Profile `preview` (internal APK), version `1.0.0` versionCode `3`, commit `e2e78da`. Link: <https://expo.dev/accounts/ekkoo/projects/fixit/builds/a8f7b904-f975-429b-8cb8-830ff926ef5e>. Should be done ~11:12–11:22 Baghdad time.
- **EAS quota (ekkoo, Free plan, billing period May 1 → Jun 1 UTC):**
  - **iOS: 15/15 used — CAPPED until June 1.** Cannot trigger a new EAS iOS build this billing cycle. Either wait, upgrade Starter ($19) → build → cancel, or build locally with `npx expo run:ios --device` on the Mac (doesn't touch EAS quota).
  - Android: 14/15 used. One slot left — save it for a fix-up build if the preview surfaces a real bug.
  - Reset: **Mon Jun 1, 03:00 Baghdad time** (= 00:00 UTC).
- **Unpushed / uncommitted:** none. Tree clean.

### Mac setup (run these on first pull)

```sh
git fetch origin
git pull origin master            # expect: Updating 3089207..e2e78da, 8 commits

# .env files are gitignored — copy mobile/.env over manually from Windows if you haven't already.
# Mobile env keys needed are listed in mobile/.env.example.

cd api && npm install && npx prisma generate
cd ../mobile && npm install        # will trigger root postinstall — should print one of:
                                   #   "[root postinstall] patch-package not installed (API-only build); skipping"  OR
                                   #   "[root postinstall] react-native ... skipping"  OR
                                   #   patch-package output applying mobile/patches/react-native+0.81.5.patch
                                   # All three are fine.
```

### iOS path on Mac (because EAS iOS is locked until Jun 1)

```sh
cd mobile
npx expo run:ios --device          # builds locally via Xcode, installs on connected iPhone.
                                   # Does NOT touch EAS build quota.
                                   # Requires Xcode + an Apple Developer cert configured in Xcode.
```

If `expo run:ios` fails on the first run, the usual culprits are:
- Cocoapods missing → `sudo gem install cocoapods` then `cd ios && pod install`.
- Xcode signing → open `mobile/ios/FixIt.xcworkspace`, select the FixIt target, Signing & Capabilities → pick your Team.

### Test plan once Android APK is in hand (priority order)

1. **Auth bootstrap resilience** — turn off wifi mid-app-open. Should now show a "Couldn't reach the server / Try again / Sign out" screen instead of dumping you to `/auth`. Turn wifi back on → Try again → resumes normally.
2. **API timeouts** — same wifi-off trick: any API call (e.g. open shop feed) should fail with "Request timed out" toast within ~15s, not hang forever.
3. **Bid date clear** — shop creates a bid with a service date, then edits and *clears* the date → save → reload → date field is actually empty. (Previously the empty value was sent as `undefined` and ignored.)
4. **Double-tap races** — mash the verify button on OTP screen, mash "Accept" on a bid, mash "Delete" on a post. None should produce duplicate API calls / 409s.
5. **Public shop payload** — open any other shop's profile → network response for `GET /shops/by-id/:id` should NOT contain `fcmToken`, `preferredLocale`, `bannedAt`, or `role`.
6. **Cross-owner post enumeration** — as an *owner* account, hit `GET /api/v1/posts/<some-other-owner's-post-id>` directly → should 403, not return the post.
7. **Hours-left label** — find any post under 1 hour from expiry → should show `<1h`, not `0h` or `1h`.
8. **Shop tab bar inset** — on a notched iPhone, the shop tab bar should now clear the home indicator (mirrors owner tabs that already did).
9. **404 page** — manually navigate to `/foo` → branded "Not found" screen with "Go home" CTA in user's language.
10. **Arabic chat bubble** — long Arabic message ending in harakat. **Note:** the persistent clipping on *one specific Android device* (the patch wasn't fully effective) is still expected; we shipped anyway. iOS should be fine.
11. **i18n strings added today** — `requestTimedOut`, `networkErrorTitle`, `networkErrorBody`, `signOut`, `loadFailed`, `invalidShop`, `lessThanOneHourLeft`, `notFoundTitle`, `notFoundBody`, `goHome` — check Arabic translations look right (I added them but a native-Arabic eye is better than mine).

### Things deliberately *not* done today (carrying forward)

The 2026-05-22 todos list (APNs key upload, `servicesCars` Switch in shop profile editor, Iraqi car catalog gaps, sub-district coverage, Supabase migration, AuditLog anonymization, Apple Sign-In, Facebook auth) all still apply — **see below**. None of today's work touched them.

### Don't forget

- **iOS push testing still needs APNs key uploaded** (was already the top action item from 2026-05-22, still not done).
- The `ChatMessageBubble.tsx` `textBreakStrategy` move from style → prop was a real fix (RN silently drops unknown style keys) but it did *not* resolve the device-specific Android clipping. We shipped knowing that limitation.
- Push to `origin/master` already done. EAS build was uploaded from local working dir (not pulled from git), so the build has everything even though the push is fresh.

---

## (Historical) 2026-05-22 brief

## Pick up here

You're on Mac, pulling fresh. **iOS test pass** for the work shipped today is the headline:

1. Pull (you've already done `git pull` if you're reading this on Mac).
2. Install + regenerate Prisma client:
   ```sh
   cd api && npm install && npx prisma generate
   cd ../mobile && npm install
   ```
3. **Set up iOS APNs credentials on Expo Push Service** before any iOS push test — without this, every iOS push silently drops (same root cause as the Android FCM V1 bug we fixed today):
   ```sh
   cd mobile
   npx eas-cli credentials -p ios
   ```
   Navigate to **Push Notifications**. If "Apple Push Notifications service" is not configured, upload an APNs key from Apple Developer → Keys → "Apple Push Notifications service (APNs)".
4. Build + run on a physical iPhone:
   ```sh
   cd mobile
   npx expo run:ios --device
   ```

## What shipped today (13 commits, all pushed to origin/master)

| Commit | What |
|--------|------|
| `7a938b1` | API: parse Expo ticket errors, clear stale `ExponentPushToken[...]` on `DeviceNotRegistered`, set Android notification channel |
| `f38b29c` | API: `safePreview()` grapheme-safe truncation of chat push body (strips trailing combining marks / ZWJ / lone high surrogate) |
| `6fc1b3e` + `be5bcc3` | Roll back `directUrl = env("DIRECT_URL")` from `prisma/schema.prisma` — was blocking Fly deploy; re-add when Supabase migration starts (see todos.md) |
| `2daeada` | Mobile: `pushEvents` pub/sub + `addNotificationReceivedListener` → owner home and shop feed auto-refresh when a push arrives in foreground |
| `55e94e3` | Mobile: chip + bubble `paddingHorizontal +4` and `overflow: 'visible'` to guard Samsung One UI 8 Arabic last-char clipping |
| `40fd4e7` | **Motorcycle feature**: new `VehicleType` enum + `Post.vehicleType` + `Post.motorcycleDetails` + `Shop.servicesMotorcycles`. Owner post editor vehicle-type chips, motorcycle-specific category set, shop signup toggle, post cards display |
| `2ab597b` | Fix: motorcycle Arabic label (ماطور / توكتوك), delete-user FK cascade for Report/JobReview/etc, drop confirmation alert, safe-area on /report screen, ⋮ on owner-side shop profile |
| `531d145` | Fix: drop empty `Alert.alert("", "", [...])` wrappers in remaining three ⋮ overflow sites (chat header, chat message, shop feed post) — they were rendering as oversized blank modals on Android |
| `fb7c221` | Fix: cascade-delete also clears `AuditLog.actorUserId` rows for the user being deleted (was the second FK that blocked) |
| `f70b6d1` | Fix: allow shop signup with **only** Tuktuk / Motor toggled (no Repair/Parts/Towing) — auto-set all three offers true |
| `a458445` | Feature: `Shop.servicesCars` (default true) so moto-only shops don't see car requests. Moto-only signup routes straight to `/signup/shop-location`, skipping `shop-makes` / `shop-repair-cats` / `shop-parts-cats`. Label renamed to **"Tuktuk / Motor"** (was "I service motorcycles / tuktuks") |
| `4b29f69` (pre-today) | EAS remote build numbers + ascAppId — was already pushed |
| _next commit_ | Pre-existing Google Sign-In SHA / OAuth wiring that's been sitting in the working tree (eas.json env vars baked in, google-services.json with 2 new Android OAuth clients, etc.) — committed in this push so Mac sees them |

## iOS test plan (in priority order)

1. **APNs configured** — `eas credentials -p ios` shows APNs key set.
2. **Build comes up** — `npx expo run:ios --device` succeeds. Sign in works (Apple Sign-In may or may not be wired yet — see todos).
3. **Push arrives** — from a second account on Android, place a bid on this iPhone account's post → notification banner shows on the iPhone.
4. **Auto-refresh** — sit on owner home foregrounded, have another account bid → list updates without pulling.
5. **Arabic chat bubble** — switch language to Arabic, send a long message ending in a base letter + harakat → last char shouldn't drop. (Less likely on iOS than Samsung — iOS's CoreText is generally robust — but worth a smoke check.)
6. **Motorcycle flow** — create a Tuktuk/Motor post, confirm picker swaps, single text field appears, card shows 🏍 + the entered text.
7. **Shop signup moto-only** — toggle only Tuktuk / Motor → Continue → should go straight to Shop location (no car make picker).
8. **Report flow** — tap ⋮ on chat header / chat message / shop feed post / shop profile → straight to /report (no empty modal), screen content not under the iOS status bar.
9. **Delete account** — settings → delete → should succeed (had been 500ing all morning).

## Things I flagged today that aren't done yet

### Action items for the next session

- [ ] **APNs key upload to Expo** — see step 3 above. Required before any iOS push works at all.
- [ ] **Add `servicesCars` Switch to shop profile editor** — currently existing shops can only switch to moto-only by deleting + re-signing-up. Mirror the existing `servicesMotorcycles` Switch in `mobile/app/shop/(tabs)/profile.tsx` (look for `putServiceField` calls). ~10 lines.
- [x] **Iraqi car catalog gaps** — **DONE 2026-06-06.** Catalog grew 33 → 79 makes / ~150 → 377 models in `api/prisma/data/vehicles-iq.json`. Popular tier (sortOrder 0–24) preserved byte-for-byte; 44 new makes added at sortOrder 1000 covering all the listed gaps (Dodge / RAM / Infiniti / Genesis / Cadillac / Lincoln / Chrysler / Acura / Buick / BAIC / Foton / Hummer) + ~30 more (Iran Khodro, Saipa, JAC, GAC, Hongqi, Lynk & Co, NIO, XPeng, etc.) with EN + IQ-Arabic names. Run `npm run db:seed` to apply on local; deploy will pick it up via the runtime bootstrap fallback in `routes/catalog.ts`.
- [x] **Iraqi sub-districts coverage** — **DONE 2026-06-06.** All 19 governorates now covered (236 rows in `api/prisma/data/districts.json`, every governorate center selectable). Seed file moved out of `prisma/seed.ts` (collapsed ~280 lines → one `upsertDistrictsFromJson(prisma)` call); runtime fallback in `routes/districts.ts` lazy-seeds per-city if any governorate is empty.
- [ ] **EAS production build** — only after preview is validated on iOS + Android. Use `--profile production` (signed AAB for Play / signed IPA for App Store).

### Bigger follow-ups deferred

- [ ] **Supabase migration** — `directUrl` was removed from `prisma/schema.prisma` today because it was blocking Fly deploys. Re-add when actually migrating: see `Docs/todos.md` for the 6-step plan. After re-adding the line, set the `DIRECT_URL` Fly secret to the Supabase direct (not pooler) connection.
- [ ] **AuditLog retention** — `cascadeDeleteUser` currently *hard-deletes* AuditLog rows where the deleted user was the actor. For long-term compliance, switch to anonymizing (point at a sentinel "deleted-user" row) instead. See comment block in `api/src/services/delete-user.ts`.
- [ ] **Apple Sign-In** — todos.md high-priority. Not touched today.
- [ ] **Facebook auth + email/password** — todos.md high-priority. Needs a product decision before code.

### Cosmetic / low priority

- [ ] FixIt notification icon (`mobile/assets/images/fixit-notification-96.png`) reads similar to WhatsApp at status-bar size when tinted green (`#2D6A4F`). Cosmetic; consider a distinct silhouette.
- [ ] "Mosul" in `cities.json` / districts should officially be **"Nineveh"** (محافظة نينوى). Minor naming consistency; not blocking.

## Active bugs to know about

- _none currently open_ (today's delete-account 500, empty report popup, and chip clipping were all resolved)

## Uncommitted / unpushed at end of today

- All committed and pushed as of session end (this commit included).

## Don't forget

- `Co-Authored-By: Claude Opus 4.7 (1M context)` trailer was used on all commits today per `~/.claude/CLAUDE.md`.
- API is on Fly app `fixit-api` (`https://fixit-api.fly.dev`). Postgres is Fly Postgres (`fixit-pg-db.internal`) — `DATABASE_URL` already set; no `DIRECT_URL` needed (we rolled it back).
- For iOS push testing, you need an **APNs key**, not a certificate — Expo's docs walk through it: <https://docs.expo.dev/push-notifications/push-notifications-setup/>.
- The current Android preview APK on file (`expo.dev/artifacts/eas/2hs5m4iaPct5MZhNEpreJ3.apk`, expires 2026-06-05) is from commit `55e94e3` — **does not** include motorcycle, moto-only signup, or report dialog fixes. Build a fresh one when you want to retest on Android.
