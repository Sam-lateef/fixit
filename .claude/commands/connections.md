Execute **CONNECTIONS** protocol (FixIt):

1. Read **`docs/_CONNECTIONS.md`**.
2. From the user's message, infer the **file(s) or area** (e.g. `mobile/lib/google-signin-native.ts`, `POST /auth/firebase`).
3. Reply with:
   - **Depends on:** upstream modules, env, native config
   - **Used by:** screens, API, other libs
   - **If changed, watch for:** tests, OAuth redirect, Prisma, etc.

If the component is **not** in the map yet, say so and offer to **add a row** to `_CONNECTIONS.md` on `/end`.

End with: `--- CONNECTIONS CHECKED ---`
