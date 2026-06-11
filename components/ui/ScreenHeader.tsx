import LanguageSelector from "@/components/ui/LanguageButton";
import { Colors, FontSize, FontWeight } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { scale, spacing } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
    I18nManager,
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

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* LEADING SECTION — native RTL mirrors the row automatically */}
      <View style={styles.leftSection}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons
              // Icon glyphs never auto-flip — mirror the back arrow manually.
              name={I18nManager.isRTL ? "arrow-forward" : "arrow-back"}
              size={scale(22)}
              color={Colors.textPrimary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}

        <Text style={[styles.title, { fontFamily: font.medium }]}>
          {title}
        </Text>
      </View>

      {/* TRAILING SECTION */}
      <View style={styles.rightSection}>
        {showLanguage && <LanguageSelector />}

        {rightElement ? (
          <View style={styles.right}>{rightElement}</View>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
  },
  leftSection: {
    flexDirection: "row",
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  placeholder: { width: scale(40) },
});
