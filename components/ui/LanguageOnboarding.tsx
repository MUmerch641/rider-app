import { isRTL, LANGUAGE_STORAGE_KEY } from "@/constants/i18n";
import { Colors, FontSize, Radius, Shadow } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { scale, scaledFont, spacing, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  I18nManager,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const LANGUAGES = [
  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
  { code: "ku", label: "Kurdish", native: "کوردی", flag: "🏔️" },
  { code: "ar", label: "Arabic", native: "عربي", flag: "🇸🇦" },
];

export function LanguageOnboarding() {
  const font = useAppFont();
  const { i18n } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState("en");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((saved) => {
      if (!saved) setVisible(true);
    });
  }, []);

  const handleContinue = async () => {
    if (loading) return;
    setLoading(true);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, selected);
    i18n.changeLanguage(selected);
    const shouldBeRTL = isRTL(selected);
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
      if (!__DEV__) {
        await Updates.reloadAsync();
        return;
      }
    }
    setLoading(false);
    setVisible(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Ionicons
              name="globe-outline"
              size={scale(40)}
              color={Colors.primary}
            />
            <Text style={[styles.title, { fontFamily: font.semibold }]}>
              Choose your language
            </Text>
            <Text style={[styles.subtitle, { fontFamily: font.regular }]}>
              زمانی خۆت هەڵبژێرە · اختر لغتك
            </Text>
          </View>

          <View style={styles.list}>
            {LANGUAGES.map((lang) => {
              const active = selected === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => setSelected(lang.code)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.flag}>{lang.flag}</Text>
                  <View style={styles.optionTexts}>
                    <Text
                      style={[
                        styles.nativeLabel,
                        { fontFamily: active ? font.semibold : font.medium },
                        active && styles.nativeLabelActive,
                      ]}
                    >
                      {lang.native}
                    </Text>
                    <Text
                      style={[styles.enLabel, { fontFamily: font.regular }]}
                    >
                      {lang.label}
                    </Text>
                  </View>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active && (
                      <Ionicons
                        name="checkmark"
                        size={scale(12)}
                        color={Colors.card}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.card} size="small" />
            ) : (
              <Text style={[styles.btnLabel, { fontFamily: font.semibold }]}>
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    width: "100%",
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: spacing.xl,
    ...Shadow.card,
  },
  header: { alignItems: "center", marginBottom: spacing.xl, gap: spacing.xs },
  title: {
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: verticalScale(20),
  },
  list: { gap: spacing.sm, marginBottom: spacing.xl },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.inputBg,
  },
  optionActive: { borderColor: Colors.primary, backgroundColor: "#F3EEFF" },
  flag: { fontSize: scaledFont(24) },
  optionTexts: { flex: 1 },
  nativeLabel: { fontSize: FontSize.md, color: Colors.textPrimary },
  nativeLabelActive: { color: Colors.primary },
  enLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: verticalScale(2),
  },
  radio: {
    width: scale(22),
    height: scale(22),
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.borderButton,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: spacing.md + verticalScale(2),
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.7 },
  btnLabel: { fontSize: FontSize.md, color: Colors.card },
});
