# Next Session — Handoff Brief

> Overwritten by `/end` each session. Last updated: 2026-05-22 on Windows.

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
- [ ] **Iraqi car catalog gaps** — abandoned iqcars.net scrape (Vercel WAF blocked WebFetch). Next-session path: use CarQueryAPI (carqueryapi.com) or NHTSA Vehicle API as the data source + curate to Iraqi market. Known mainstream gaps from today's WebSearch hits: Dodge (Charger/Challenger/Durango/RAM), Infiniti (QX80/QX60), Genesis (G80/G70/GV80), RAM 1500, BAIC, Foton, Hummer, Cadillac (Escalade), Lincoln (Navigator), Chrysler (300), Acura, Buick.
- [ ] **Iraqi sub-districts coverage** — Baghdad is dense (~110 sub-districts seeded) but every other governorate has only 2–6 sub-districts. Pick a source (Wikipedia or OSM is fine for first pass) and fill out the 18 thin governorates. Seed lives in `api/prisma/seed.ts`. Run `npm run db:seed` after.
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
