# Technical specifications — FixIt

**Canonical detail:** `docs/fixit_implementation_guide (1).md` (stack, Prisma, routes, flows, env vars).

**Stack (summary):**

- Mobile: Expo / React Native, Expo Router, Firebase Auth, `@react-native-google-signin/google-signin` on dev builds, `expo-auth-session` in Expo Go only.
- Backend: Node API (see repo `api/` if present), Prisma, Fly.io deployment notes in project docs when added.

**Keep this file short:** record **deltas** only — what changed vs the implementation guide and *why* (link to `docs/decisions.md` when useful).
