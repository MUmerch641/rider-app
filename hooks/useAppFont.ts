import { isRTL } from "@/constants/i18n";
import { FontFamily } from "@/constants/theme";
import { useTranslation } from "react-i18next";

export function useAppFont() {
  const { i18n } = useTranslation();
  const rtl = isRTL(i18n.language);

  return {
    regular: rtl ? FontFamily.kuRegular : FontFamily.regular,
    medium: rtl ? FontFamily.kuMedium : FontFamily.medium,
    semibold: rtl ? FontFamily.kuSemibold : FontFamily.semibold,
    bold: rtl ? FontFamily.kuBold : FontFamily.bold,
    extrabold: rtl ? FontFamily.kuBold : FontFamily.extrabold, // no ExtraBold in Noto
    rtl, // bonus — gives you rtl flag too
  };
}
