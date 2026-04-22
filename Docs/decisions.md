# Decision records — FixIt

Newest first. One short paragraph per decision: **context → decision → consequence**.

---

### 2026-04-10 — Google Sign-In: Expo Go vs native dev build

- **Context:** Expo Go cannot load `@react-native-google-signin/google-signin`; Firebase SHA work applies to native builds.
- **Decision:** Treat **dev client** (`expo run:android` / `run:ios`) as the default for Google auth validation; Expo Go only for flows that intentionally use `expo-auth-session` + `auth.expo.io`.
- **Consequence:** Docs, rules, and commands must say this explicitly so sessions are not derailed by `expo start` habits.

### 2026-04-10 — Cursor commands + `AGENTS.md` as project memory

- **Context:** Chat context is limited; Ekkoo command templates were copied into FixIt by mistake.
- **Decision:** FixIt-specific `.cursor/commands/*`, `AGENTS.md`, and minimal `docs/*` tracker files; remove shader/Ekkoo-only commands from this repo.
- **Consequence:** `/start` + `/end` + `/checkpoint` become the durable ritual; rules catch invariants automatically.
