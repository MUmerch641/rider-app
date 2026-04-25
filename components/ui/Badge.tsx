import { Colors, FontWeight } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import {
  fontSize,
  radius,
  scale,
  spacing
} from "@/utils/responsive";
import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

type BadgeVariant = "primary" | "success" | "danger" | "warning" | "neutral";

interface BadgeProps {
  label: string | number;
  variant?: BadgeVariant;
  dot?: boolean;
  style?: ViewStyle;
}

export function Badge({
  label,
  variant = "primary",
  dot = false,
  style,
}: BadgeProps) {
  const font = useAppFont();

  const bg: Record<BadgeVariant, string> = {
    primary: Colors.primaryLight + "22",
    success: Colors.successBg,
    danger: Colors.dangerBg,
    warning: "#FFF3E0",
    neutral: Colors.inputBg,
  };
  const fg: Record<BadgeVariant, string> = {
    primary: Colors.primaryLight,
    success: Colors.success,
    danger: Colors.danger,
    warning: Colors.warning,
    neutral: Colors.textSecondary,
  };

  return (
    <View style={[styles.badge, { backgroundColor: bg[variant] }, style]}>
      {dot && <View style={[styles.dot, { backgroundColor: fg[variant] }]} />}
      <Text
        style={[
          styles.label,
          { color: fg[variant], fontFamily: font.semibold },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

interface CounterBadgeProps {
  count: number;
  style?: ViewStyle;
}

export function CounterBadge({ count, style }: CounterBadgeProps) {
  const font = useAppFont();
  return (
    <View style={[styles.counter, style]}>
      <Text style={[styles.counterText, { fontFamily: font.bold }]}>
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  counter: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  counterText: {
    color: Colors.textInverse,
    fontSize: fontSize.sm,
    fontWeight: FontWeight.bold,
  },
});
