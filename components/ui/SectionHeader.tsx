import { isRTL } from "@/constants/i18n";
import { Colors, FontWeight } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { fontSize, spacing } from "@/utils/responsive";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  style?: ViewStyle;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  actionIcon,
  style,
}: SectionHeaderProps) {
  const font = useAppFont();
  const { i18n } = useTranslation();
  const rtl = isRTL(i18n.language);

  return (
    <View
      style={[
        styles.row,
        { flexDirection: rtl ? "row-reverse" : "row" },
        style,
      ]}
    >
      <Text
        style={[
          styles.title,
          { fontFamily: font.regular, textAlign: rtl ? "right" : "left" },
        ]}
      >
        {title}
      </Text>
      {(actionLabel || actionIcon) && (
        <TouchableOpacity
          onPress={onAction}
          style={[
            styles.action,
            { flexDirection: rtl ? "row-reverse" : "row" },
          ]}
          activeOpacity={0.7}
        >
          {actionIcon}
          {actionLabel && (
            <Text style={[styles.actionLabel, { fontFamily: font.semibold }]}>
              {actionLabel}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: FontWeight.regular,
    color: Colors.textPrimary,
  },
  action: {
    alignItems: "center",
    gap: spacing.xs,
  },
  actionLabel: {
    fontSize: fontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
});
