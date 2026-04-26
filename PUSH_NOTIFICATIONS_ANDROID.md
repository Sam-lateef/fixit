# Android Push Notifications — finish setup on Windows

After `git pull` and rebuilding Android, push will only work after FCM credentials are uploaded to Expo (same way APNs was for iOS earlier).

## Steps

1. Firebase Console → Project Settings → Service accounts → "Generate new private key" → download JSON.
2. From mobile/ run `npx eas credentials`:
   - Platform: Android
   - Build profile: development
   - Push Notifications: Manage your Google Service Account Key for Push Notifications (FCM V1)
   - Set up a new Google Service Account Key
   - Upload the downloaded JSON.
3. Rebuild Android: `npm run android -w mobile` (need Java + Android SDK).
4. Install on device, log in, allow notification permission.
5. Verify Sam's user row has `fcmToken` starting with `ExponentPushToken[`.
6. From iPhone, send Sam a chat message or accept a bid — Android should buzz.

## Code already in place

- `mobile/lib/push-notifications.ts` uses `getExpoPushTokenAsync()` (works for both iOS & Android).
- `api/src/services/fcm.ts` detects `ExponentPushToken[` prefix and routes via `https://exp.host/--/api/v2/push/send`.
- iOS APNs credentials already uploaded to Expo (don't redo).

## Backend env on Fly

- `FIREBASE_SERVICE_ACCOUNT_JSON` is the legacy fallback. Not needed for Expo path but harmless to leave set.
