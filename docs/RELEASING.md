# Releasing Bantay

Everything here happens on GitHub. You do not need Node, Android Studio or a
local toolchain to produce a downloadable Android app.

---

## 1. The Android app: published on every push

The app lives in `mobile/`. It signs in to the shared Bantay database, so the
same account works in Bantay Admin and every report, verification and alert
is shared.

Every push to `main` that touches `mobile/` runs the **Android APK** workflow
(`.github/workflows/android-apk.yml`). It typechecks, lints and tests the app,
generates the Android project with `expo prebuild`, builds a release APK and
publishes it as the latest GitHub Release:

1. Open the **Releases** page of this repository on an Android phone.
2. Tap `bantay-<version>-build<N>.apk` in the latest release.
3. Open the download and allow installing from your browser if asked.

Each build is signed with the same key and numbered by its run, so a newer
build installs over an older one and keeps the user signed in. To build
without pushing, run **Android APK** from the Actions tab.

---

## 2. The Google Play Store

The published APK is signed with the Expo template's shared debug key. That is
fine for sideloading, but **Play rejects it**. For a Play Store release, build
an App Bundle with EAS, which creates and keeps your upload key:

```bash
cd mobile
npx eas-cli@latest build --platform android
```

This needs a free Expo account; the first run sets up `eas.json`. Upload the
resulting `.aab` in the Google Play Console under **Production → Create new
release**.

---

## Version numbers

The app's version is `expo.version` in `mobile/app.json`; bump it by hand when
you cut a new version. The build number (Android `versionCode`) is the Android
APK workflow's run number, set by `mobile/app.config.js`, so every published
APK is uniquely numbered and installs as an update.
