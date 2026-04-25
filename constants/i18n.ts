import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";
import ar from "../locales/ar.json";
import en from "../locales/en.json";
import ku from "../locales/ku.json";

export const LANGUAGE_STORAGE_KEY = "app_language";
export const RTL_LANGS = ["ar", "ku"];

export const isRTL = (lang: string) => RTL_LANGS.includes(lang);
export const getDirection = () => (isRTL(i18n.language) ? "rtl" : "ltr");

i18n.on("languageChanged", (lang) => {
  const rtl = isRTL(lang);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
});

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
    ku: { translation: ku },
  },
  lng: "en",
  fallbackLng: "en",
});

export default i18n;
