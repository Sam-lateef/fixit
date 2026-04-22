# FixIt — connection map (living doc)

**Purpose:** “If I change X, what breaks?” Update when you add cross-cutting features.

## Mobile (`mobile/`)

| Entry / area | Depends on | Consumers / notes |
|--------------|------------|-------------------|
| `app/auth/index.tsx` | `@/components/auth/*`, `google-oauth-redirect`, `social-auth`, Firebase env | Auth stack |
| `lib/google-signin-native.ts` | `@react-native-google-signin/google-signin`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Dev / release builds only |
| `components/auth/GoogleOAuthButton.tsx` | `expo-auth-session` Google provider, `getGoogleOAuthRedirectUri` | **Expo Go** + web proxy path |
| `lib/google-oauth-redirect.ts` | `expo-constants` | Chooses native vs proxy |
| `lib/social-auth.ts` | Firebase Auth, `apiFetch` `/api/v1/auth/firebase` | All social sign-ins |
| `app/_layout.tsx` | SplashScreen, providers | Cold start |
| `google-services.json` + `android/app/debug.keystore` | Firebase Console SHA-1 | Native Google on Android |
| `lib/sign-out.ts` | `auth-storage`, Firebase Auth, RevenueCat | Used by profile + signup/auth stack headers (`SessionHeaderButtons`) |

## API (when present: `api/`)

| Entry | Depends on | Notes |
|-------|------------|--------|
| `POST /api/v1/auth/firebase` | Firebase Admin verify | Called after client Firebase sign-in |

## Docs

| File | Role |
|------|------|
| `fixit_implementation_guide (1).md` | Full product + tech spec |
| `AGENTS.md` (root) | Agent + human orientation |

---

## How to use

1. Before a risky refactor, open this file and **add a row** for the new module.
2. On **`/end`**, if you touched boundaries, update **Depends on** / **Consumers**.
