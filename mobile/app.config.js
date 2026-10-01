// app.json holds the configuration; this adds what a build supplies itself.
// - ANDROID_VERSION_CODE (optional): set by CI so each APK installs as an
//   update over the previous one (.github/workflows/android-apk.yml).
// - EXPO_BASE_URL (optional): the path the browser build is served under,
//   e.g. /Bantay on GitHub Pages (.github/workflows/web.yml). Never set for
//   the APK.
module.exports = ({ config }) => {
  let out = config;
  const versionCode = Number(process.env.ANDROID_VERSION_CODE);
  if (Number.isInteger(versionCode) && versionCode > 0) {
    out = { ...out, android: { ...out.android, versionCode } };
  }
  const baseUrl = process.env.EXPO_BASE_URL;
  if (baseUrl) {
    out = { ...out, experiments: { ...out.experiments, baseUrl } };
  }
  return out;
};
