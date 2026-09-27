// app.json holds the configuration; this adds what a build supplies itself.
// - ANDROID_VERSION_CODE (optional): set by CI so each APK installs as an
//   update over the previous one (.github/workflows/android-apk.yml).
module.exports = ({ config }) => {
  const versionCode = Number(process.env.ANDROID_VERSION_CODE);
  return Number.isInteger(versionCode) && versionCode > 0
    ? { ...config, android: { ...config.android, versionCode } }
    : config;
};
