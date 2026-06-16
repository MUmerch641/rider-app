// The expo-audio library's own AndroidManifest declares
// FOREGROUND_SERVICE_MEDIA_PLAYBACK (+ a mediaPlayback service), which gets
// merged into the final app manifest. OnWay's alarm only plays audio in the
// foreground (setAudioModeAsync({ playsInSilentMode: true }) — no background
// playback), so the app does NOT use a media-playback foreground service.
// Declaring it on Play would require a (false) demo video, so we strip it at
// manifest-merge time via tools:node="remove". The location foreground service
// (FOREGROUND_SERVICE_LOCATION) is kept — that's the real, declared use.
const { withAndroidManifest } = require("@expo/config-plugins");

const PERM = "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK";

module.exports = function removeMediaPlaybackFgs(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // Ensure the tools namespace exists so tools:node is honoured by the merger.
    manifest.$ = manifest.$ || {};
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";

    manifest["uses-permission"] = manifest["uses-permission"] || [];
    // Drop any existing add of the permission and any prior remove directive,
    // then add a single tools:node="remove" so the merged manifest excludes it.
    manifest["uses-permission"] = manifest["uses-permission"].filter(
      (p) => p?.$?.["android:name"] !== PERM,
    );
    manifest["uses-permission"].push({
      $: { "android:name": PERM, "tools:node": "remove" },
    });

    // Also neutralise the library's mediaPlayback foreground service so the
    // merged manifest carries no mediaPlayback FGS type (the app never starts
    // it). Match any <service> whose foregroundServiceType includes mediaPlayback.
    const app = manifest.application?.[0];
    if (app?.service) {
      for (const svc of app.service) {
        const type = svc?.$?.["android:foregroundServiceType"];
        if (type && type.includes("mediaPlayback")) {
          const stripped = type
            .split("|")
            .filter((t) => t !== "mediaPlayback")
            .join("|");
          if (stripped) {
            svc.$["android:foregroundServiceType"] = stripped;
          } else {
            delete svc.$["android:foregroundServiceType"];
          }
        }
      }
    }
    return cfg;
  });
};
