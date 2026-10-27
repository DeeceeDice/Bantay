# Alert notifications

## What Bantay does

Every alert - a verified hazard in your area, a typhoon warning, a broadcast,
a decision on your report or your access request - is written to the
database and reaches the app live over Supabase realtime.

**While Bantay is running but not on screen**, a new alert is also shown as a
system notification, and tapping it opens the Alerts tab. On screen, the
Alerts tab's red badge already says it, so there is no notification on top.

- **Android app:** local notifications through `expo-notifications`, on a
  "Hazard alerts" channel with high importance and the eye-and-pin icon.
  Android 13 and later ask for permission the first time the signed-in app
  opens.
- **Browser:** the browser's Notification API while the Bantay tab is open but
  hidden. Desktop browsers show these; turning the switch on asks for
  permission. Chrome on Android only shows notifications from a service
  worker, which the web build does not have, so there the alert waits in the
  Alerts tab.
- **The switch:** Profile -> Notification preferences -> *Alert
  notifications* (on by default). At most three notifications for one burst
  of alerts.

Code: `mobile/src/core/platform/notifications.ts` (and `.web.ts`), and
`notifyNewAlerts` in `mobile/src/state/appStore.tsx`.

## What it does not do

Nothing reaches a phone whose app has been closed, or that Android has put to
sleep. That needs **push**: a server sends the alert to Google's push service
(Firebase Cloud Messaging), which wakes the phone. Bantay has no push
service, and the app says so rather than offering a switch that cannot work.

## Adding real push

It needs accounts only the project owner can create, so it is not built in.
The steps, all on free tiers:

1. **Firebase:** create a project at console.firebase.google.com, add an
   Android app with package `com.deeceedice.bantay`, download
   `google-services.json` into `mobile/`, and set
   `expo.android.googleServicesFile` to it in `app.json`.
2. **Expo:** `npx eas-cli@latest init` in `mobile/` (a free Expo account),
   which writes the project id into `app.json`, then upload the Firebase
   service account key under *Credentials -> Android -> FCM V1*.
3. **Tokens:** after sign-in, the app calls
   `Notifications.getExpoPushTokenAsync({ projectId })` and saves the token
   in a new `push_tokens` table (one row per device, readable only by its
   owner).
4. **Sending:** an Edge Function, called by a database webhook on `alerts`
   inserts, looks up the recipient's tokens and posts them to Expo's push API
   (`https://exp.host/--/api/v2/push/send`, free).

The browser can get real push the same way with a service worker and Web Push
(VAPID keys kept as an Edge Function secret).
