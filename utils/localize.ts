import { useTranslation } from "react-i18next";
import type { Translatable } from "@/api";

export type LangKey = "en" | "ar" | "ku";

const FALLBACK_ORDER: LangKey[] = ["en", "ar", "ku"];

/**
 * Pick a string out of a Translatable value for the given language.
 * If the value is already a plain string, return it as-is.
 * Falls back across known languages so we never render an empty label.
 */
export function localizeName(
  value: Translatable | undefined | null,
  lang: LangKey,
): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (value[lang]) return value[lang] as string;
  for (const k of FALLBACK_ORDER) {
    if (value[k]) return value[k] as string;
  }
  return "";
}

/**
 * Hook variant of localizeName — reads the active language from i18next.
 */
export function useLocalizedName(
  value: Translatable | undefined | null,
): string {
  const { i18n } = useTranslation();
  const lang = (i18n.language as LangKey) ?? "en";
  return localizeName(value, lang);
}
