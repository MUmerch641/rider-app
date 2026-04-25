import LanguageSelector from "@/components/ui/LanguageButton";
import { isRTL } from "@/constants/i18n";
import { Colors, FontSize, FontWeight } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { scale, spacing } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
  style?: ViewStyle;
  onBack?: () => void;
  showLanguage?: boolean;
}

export function ScreenHeader({
  title,
  showBack = true,
  rightElement,
  style,
  onBack,
  showLanguage = true,
}: ScreenHeaderProps) {
  const router = useRouter();
  const font = useAppFont();
  const { i18n } = useTranslation();
  const rtl = isRTL(i18n.language);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.container,
        { flexDirection: rtl ? "row-reverse" : "row" },
        style,
      ]}
    >
      {/* LEFT SECTION — leading side (flips in RTL) */}
      <View
        style={[
          styles.leftSection,
          { flexDirection: rtl ? "row-reverse" : "row" },
        ]}
      >
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons
              name={rtl ? "arrow-forward" : "arrow-back"}
              size={scale(22)}
              color={Colors.textPrimary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}

        <Text
          style={[
            styles.title,
            { fontFamily: font.medium, textAlign: rtl ? "right" : "left" },
          ]}
        >
          {title}
        </Text>
      </View>

      {/* RIGHT SECTION — trailing side (flips in RTL) */}
      <View
        style={[
          styles.rightSection,
          { flexDirection: rtl ? "row-reverse" : "row" },
        ]}
      >
        {showLanguage && <LanguageSelector />}

        {rightElement ? (
          <View
            style={[
              styles.right,
              { flexDirection: rtl ? "row-reverse" : "row" },
            ]}
          >
            {rightElement}
          </View>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
  },
  leftSection: {
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
    paddingTop: spacing.sm,
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: Colors.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.regular,
    color: Colors.textPrimary,
  },
  rightSection: {
    alignItems: "center",
    gap: spacing.md,
  },
  right: {
    alignItems: "center",
    gap: spacing.sm,
  },
  placeholder: { width: scale(40) },
});
