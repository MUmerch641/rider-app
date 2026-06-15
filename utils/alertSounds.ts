// Bundled new-order alert presets. The admin dashboard selects one per role and
// the backend stores its key; the app resolves that key to a bundled file here.
// Unknown / missing keys fall back to "default". `require()` returns the bundled
// asset module id, which createAudioPlayer (expo-audio) accepts directly.
export const ALERT_SOUNDS = {
  default: require("@/assets/sounds/new_order.wav"),
  chime: require("@/assets/sounds/alert_chime.wav"),
  bell: require("@/assets/sounds/alert_bell.wav"),
  siren: require("@/assets/sounds/alert_siren.wav"),
  beep: require("@/assets/sounds/alert_beep.wav"),
} as const;

export type AlertSoundKey = keyof typeof ALERT_SOUNDS;

export const ALERT_SOUND_KEYS: AlertSoundKey[] = [
  "default",
  "chime",
  "bell",
  "siren",
  "beep",
];

export function resolveAlertSound(key?: string | null) {
  if (key && key in ALERT_SOUNDS) return ALERT_SOUNDS[key as AlertSoundKey];
  return ALERT_SOUNDS.default;
}
