# Releasing Bantay

Everything here happens on GitHub. You do not need Node, Flutter, Android
Studio or a Mac installed to produce a downloadable Android app.

---

## 1. The Android app: published on every push

The app people download is the React Native build in `mobile/`. It signs in
to the shared Bantay database, so the same account works in Bantay Admin and
every report, verification and alert is shared.

Every push to `main` that touches `mobile/` runs the **Android APK** workflow
(`.github/workflows/android-apk.yml`). It typechecks, lints and tests the app,
builds a release APK and publishes it as the latest GitHub Release:

1. Open the **Releases** page of this repository on an Android phone.
2. Tap `bantay-<version>-build<N>.apk` in the latest release.
3. Open the download and allow installing from your browser if asked.

Each build is signed with the same key and numbered by its run, so a newer
build installs over an older one and keeps the user signed in. To build
without pushing, run **Android APK** from the Actions tab.

---

## 2. The Flutter offline build

The Flutter build at the repository root keeps accounts, reports and alerts on
the phone. It does not connect to the shared database, so its accounts cannot
sign in to Bantay Admin. Every CI run still builds it (`bantay-flutter-offline-debug-apk`
under the run's **Artifacts**), and the **Release (Flutter offline build)**
workflow, run by hand from the Actions tab, publishes it as a pre-release
tagged `flutter-v<version>`, never as the latest release:

| Artifact | What it is for |
|---|---|
| `bantay-<version>-universal.apk` | Sideloading onto any Android phone |
| `bantay-<version>-arm64-v8a.apk` | Smaller build for modern phones |
| `bantay-<version>-armeabi-v7a.apk` | Older 32-bit phones |
| `bantay-<version>-x86_64.apk` | Emulators |
| `bantay-<version>.aab` | Uploading to the Google Play Console |
| `bantay-<version>-web.zip` | Serving from any static host |

The signing and shrinking notes below apply to this Flutter build.

---

## 3. Signing for the Google Play Store

Without signing secrets configured, release builds fall back to the debug key.
That is fine for sideloading but **Play will reject it**. To sign properly:

### Create an upload key

On any machine with a JDK installed:

```bash
keytool -genkey -v -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Answer the prompts and choose a strong password. **Back this file up
somewhere safe** — if you lose it you cannot ship updates to an existing Play
listing without Google's key-reset process.

### Add it to GitHub

Turn the keystore into text:

```bash
base64 -w0 upload-keystore.jks     # macOS: base64 -i upload-keystore.jks
```

Then in **Settings → Secrets and variables → Actions**, add four repository
secrets:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the base64 output above |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | your key password |
| `ANDROID_STORE_PASSWORD` | your keystore password |

The next release build picks these up automatically, signs with them, and
deletes the decoded keystore before the job ends. Nothing sensitive is ever
committed — `android/key.properties` and `*.jks` are both git-ignored.

### Building signed locally instead

Put the keystore at `android/app/upload-keystore.jks` and create
`android/key.properties`:

```properties
storePassword=<your keystore password>
keyPassword=<your key password>
keyAlias=upload
storeFile=upload-keystore.jks
```

Then `flutter build appbundle --release`. Both files are git-ignored.

---

## 4. Publishing to the Google Play Store

1. Pay the one-time Google Play Developer registration fee (25 USD).
2. In the Play Console, create an app: name **Bantay**, package
   `com.deeceedice.bantay`.
3. Upload `bantay-<version>.aab` to a testing track first.
4. Complete the store listing: description, screenshots (phone screenshots are
   mandatory), a 512×512 icon and a 1024×500 feature graphic.
5. Fill in the Data Safety form. Bantay collects location and photos; be
   explicit that location stays on the device and only hazard coordinates the
   user chooses to report are published.
6. Complete the content rating questionnaire and the privacy-policy URL field.
   **A privacy policy is mandatory** because the app requests location.
7. Roll out to internal testing, then production.

---

## 5. Publishing to the App Store

iOS needs a Mac and an Apple Developer Program membership (99 USD/year).

```bash
flutter build ipa --release
```

Then open `build/ios/archive/Runner.xcarchive` in Xcode and use Distribute App,
or upload the `.ipa` with Transporter. The permission strings Apple requires
are already in `ios/Runner/Info.plist`.

---

## 6. Hosting the web build

Download `bantay-<version>-web.zip` from a release and serve the contents from
any static host. For GitHub Pages, push the unzipped contents to a `gh-pages`
branch — the workflow already sets `--base-href /Bantay/`, which is what Pages
needs when serving from a project subpath. If you host at a domain root
instead, rebuild with `--base-href /`.

---

## 7. Optional: enable code shrinking

`android/app/build.gradle.kts` ships with `isMinifyEnabled = false`. Shrinking
cuts APK size meaningfully but changes runtime behaviour, so it should not be
turned on blind. When you can test a release build on a real device, set both
`isMinifyEnabled` and `isShrinkResources` to `true` — the necessary keep rules
are already in `android/app/proguard-rules.pro` — then install the resulting
APK and walk the full flow once: sign up, report a hazard with a photo, verify
it, check directions. If anything misbehaves, the keep rules need widening.

---

## Version numbers

`pubspec.yaml` holds `version: 1.0.0+1`. The release workflow overrides the
build number with the workflow run number so every published artifact is
uniquely versioned. Bump the `1.0.0` part by hand when you cut a new version.

The Android app's version is `expo.version` in `mobile/app.json`; its build
number is the Android APK workflow's run number (`mobile/app.config.js`).
