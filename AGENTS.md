# FixIt — agent & human playbook

Single place to orient before coding. **Session ritual:** run Cursor command **`/start`** (see `.cursor/commands/start.md`). **End of session:** **`/end`**. Quick pulse: **`/status`**. Mid-session save: **`/checkpoint`**.

---

## 1. Read order (first time in repo or new session)

1. **This file** (`AGENTS.md`)
2. **Project rules:** `.cursor/rules/*.mdc` (especially anything `alwaysApply`)
3. **`docs/_SESSION-GUIDE.md`** — short pointers
4. **`docs/project.md`** → **`docs/specs.md`**
5. **`docs/progress.md`** (last entries) → **`docs/todos.md`**
6. **`docs/debugs.md`** (open issues)
7. **Last 2–3 entries** in **`docs/chatSummaries.md`**
8. **`docs/_CONNECTIONS.md`** — when touching cross-package flows
9. **Full product detail:** `docs/fixit_implementation_guide (1).md` (large; read sections as needed)

---

## 2. Repo layout (high level)

| Area | Path | Notes |
|------|------|--------|
| Mobile app | `mobile/` | Expo SDK 54, Expo Router, Firebase auth, RevenueCat |
| API | `api/` (if present) | Prisma, Fly.io, `/api/v1/auth/firebase`, etc. |
| Docs | `docs/` | Summaries, progress, decisions — **update on `/end`** |

---

## 3. Non-negotiables (FixIt mobile)

- **Google Sign-In (native):** validate only on a **development or release build** installed with **`npx expo run:android`** / **`npm run android`** from `mobile/`. **Expo Go** uses `expo-auth-session` + `https://auth.expo.io/...` — different pipeline; do not confuse with Firebase SHA / `google-services.json` work.
- **Android signing for Google:** Firebase SHA-1 must match the keystore **Gradle** uses: `mobile/android/app/debug.keystore`. Use `npm run android:sha1` from `mobile/`. Do not register only `%USERPROFILE%\.android\debug.keystore` unless that file is copied to `android/app/` or SHA is added separately.
- **Terminal:** prefer running commands in the agent environment; do not push routine steps back to the user without cause.

Details: `.cursor/rules/fixit-mobile-expo-google.mdc`

---

## 4. Cursor commands (this repo)

| Command | Purpose |
|---------|---------|
| `/start` | Full session load: docs + rules + recap |
| `/end` | Summarize session; update docs; optional git |
| `/status` | Quick progress / todos / open debugs |
| `/connections` | Dependency / impact map from `_CONNECTIONS.md` |
| `/checkpoint` | Lightweight mid-session write to `progress` + optional `chatSummaries` stub |

Files live in **`.cursor/commands/`**.

---

## 5. When full spec is needed

Open **`docs/fixit_implementation_guide (1).md`** for product, flows, schema, and UI reference. Prefer updating **`docs/specs.md`** when implementation diverges from that guide (short delta notes), not duplicating the whole guide.

---

## 6. i18n & markets

Iraq-first; English + Iraqi Arabic (RTL). See implementation guide for copy and UX rules.
