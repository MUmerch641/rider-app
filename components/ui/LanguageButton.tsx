import { isRTL, LANGUAGE_STORAGE_KEY } from "@/constants/i18n";
import { Colors, FontSize, Radius, Shadow } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { scale, spacing, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  I18nManager,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GlobeIcon } from "./icons/GlobeIcon";

const LANGUAGES = [
  { code: "en", label: "English", native: "Eng" },
  { code: "ku", label: "Kurdish", native: "کوردی" },
  { code: "ar", label: "Arabic", native: "عربي" },
];

const LanguageSelector = () => {
  const font = useAppFont();
  const { i18n } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<View>(null);
  const currentLang = LANGUAGES.find((l) => l.code === i18n.language);

  const openDropdown = () => {
    buttonRef.current?.measure((_fx, _fy, _w, h, px, py) => {
      setDropdownPos({ top: py + h + scale(6), left: px - scale(10) });
      setVisible(true);
    });
  };

  const changeLanguage = (code: string): void => {
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    i18n.changeLanguage(code);
    setVisible(false);
    const shouldBeRTL = isRTL(code);
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
      if (!__DEV__) {
        Updates.reloadAsync();
      }
    }
  };

  return (
    <>
      <TouchableOpacity
        ref={buttonRef}
        style={styles.container}
        onPress={openDropdown}
        activeOpacity={0.8}
      >
        <GlobeIcon size={scale(18)} color="#000000" />
        <Text style={[styles.text, { fontFamily: font.regular }]}>
          {currentLang?.native || "Eng"}
        </Text>
      </TouchableOpacity>

      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View
            style={[
              styles.dropdown,
              { top: dropdownPos.top, left: dropdownPos.left },
            ]}
          >
            {LANGUAGES.map((lang, index) => {
              const isActive = i18n.language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.option,
                    index !== LANGUAGES.length - 1 && styles.optionBorder,
                    isActive && styles.optionActive,
                  ]}
                  onPress={() => changeLanguage(lang.code)}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text
                      style={[
                        styles.optionNative,
                        { fontFamily: isActive ? font.semibold : font.medium },
                        isActive && styles.activeText,
                      ]}
                    >
                      {lang.native}
                    </Text>
                    <Text
                      style={[styles.optionLabel, { fontFamily: font.regular }]}
                    >
                      {lang.label}
                    </Text>
                  </View>
                  {isActive && (
                    <View style={styles.checkCircle}>
                      <Ionicons
                        name="checkmark"
                        size={scale(12)}
                        color={Colors.card}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export default LanguageSelector;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "#e7e6eb",
    borderRadius: Radius.full,
    paddingVertical: spacing.md - verticalScale(3),
    paddingHorizontal: spacing.sm + scale(4),
    borderWidth: 0,
    borderColor: "transparent",
    alignSelf: "flex-start",
  },
  text: { fontSize: FontSize.md, color: Colors.textPrimary },
  backdrop: { flex: 1 },
  dropdown: {
    position: "absolute",
    width: scale(90),
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.inputBg,
    overflow: "hidden",
    ...Shadow.card,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm + verticalScale(2),
    paddingHorizontal: spacing.md,
  },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  optionActive: { backgroundColor: "#F3EEFF" },
  optionNative: { fontSize: FontSize.md, color: Colors.textPrimary },
  optionLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: verticalScale(1),
  },
  activeText: { color: Colors.primary },
  checkCircle: {
    width: scale(20),
    height: scale(20),
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
