import { Colors, FontWeight } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { fontSize, spacing } from "@/utils/responsive";
import React from "react";
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

  return (
    // Native RTL mirrors the row automatically.
    <View style={[styles.row, style]}>
      <Text style={[styles.title, { fontFamily: font.regular }]}>{title}</Text>
      {(actionLabel || actionIcon) && (
        <TouchableOpacity
          onPress={onAction}
          style={styles.action}
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
    flexDirection: "row",
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  actionLabel: {
    fontSize: fontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
});
