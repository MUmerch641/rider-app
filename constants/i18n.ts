import AsyncStorage from "@react-native-async-storage/async-storage";
import { reloadAppAsync } from "expo";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";
import ar from "../locales/ar.json";
import en from "../locales/en.json";
import ku from "../locales/ku.json";

// #8: initial language follows the device/OS locale (reflects the per-app
// language chosen in iOS Settings → App → Language). Kurdish variants → `ku`.
function getDeviceLanguage(): "en" | "ar" | "ku" {
  try {
    const code = (Localization.getLocales()[0]?.languageCode || "").toLowerCase();
    if (code === "ar") return "ar";
    if (code === "ku" || code === "ckb" || code === "kur" || code === "kmr") return "ku";
  } catch {
    // ignore — fall back to English
  }
  return "en";
}

export const LANGUAGE_STORAGE_KEY = "app_language";
export const RTL_LANGS = ["ar", "ku"];

export const isRTL = (lang: string) => RTL_LANGS.includes(lang);
export const getDirection = () => (isRTL(i18n.language) ? "rtl" : "ltr");

// NOTE: no forceRTL here. The device locale is only a provisional language —
// the saved app language (AsyncStorage) wins, and app/_layout.tsx is the single
// boot authority that loads it and aligns the native direction (with one
// guarded reload on drift). Writing the direction from the device locale here
// used to re-poison the persisted native direction every session for riders
// whose OS locale direction differs from their saved language (e.g. English OS
// + Arabic app), causing a forced reload on every production cold start.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
    ku: { translation: ku },
  },
  lng: getDeviceLanguage(),
  fallbackLng: "en",
});

export type AppLanguage = "en" | "ar" | "ku";

/**
 * The ONE place that switches the app language at runtime.
 *
 * Persists the choice, updates i18next, and — only when the writing direction
 * actually flips (LTR <-> RTL) — applies the native RTL change and reloads the
 * app exactly once, deferred so the current touch handler and React commit
 * finish first. Switching between two RTL languages (ar <-> ku) keeps the same
 * direction, so it updates instantly with no reload.
 *
 * Why: the old flow called an unguarded Updates.reloadAsync() straight out of
 * the touch handler (and forceRTL on every languageChanged event). A single,
 * guarded, deferred reload avoids tearing down the Hermes runtime mid event
 * loop — the crash class seen on the Users app for RTL switches.
 */
export async function setAppLanguage(code: AppLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    // non-fatal: language still applies for this session
  }

  if (i18n.language !== code) {
    await i18n.changeLanguage(code);
  }

  const shouldBeRTL = isRTL(code);
  // Same direction → no native flip, no reload. Text re-renders via i18next.
  if (I18nManager.isRTL === shouldBeRTL) return;

  I18nManager.allowRTL(shouldBeRTL);
  I18nManager.forceRTL(shouldBeRTL);

  // In dev, auto-reloading just fights Fast Refresh; the setting still persists.
  // Reload in dev too — skipping it (an old guard) left the first session
  // after a language switch in the WRONG layout direction on simulators,
  // while production reloaded correctly. reloadAppAsync works in dev (it
  // re-requests the bundle from Metro), so behavior now matches prod.

  // Defer the single reload so this handler unwinds and the runtime is torn
  // down at an idle point, not mid event-loop tick.
  setTimeout(() => {
    reloadAppAsync().catch(() => {
      // worst case: user relaunches manually; the RTL setting is persisted
    });
  }, 150);
}

export default i18n;
