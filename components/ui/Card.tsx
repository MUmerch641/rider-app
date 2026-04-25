import { Colors, Shadow } from "@/constants/theme";
import { radius, spacing } from "@/utils/responsive";
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

type CardVariant = "default" | "flat" | "soft";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: CardVariant;
  radius?: number;
  padding?: number;
}

export function Card({
  children,
  style,
  variant = "default",
  radius: radiusProp = radius.md,
  padding = spacing.md,
}: CardProps) {
  return (
    <View
      style={[
        styles.base,
        { borderRadius: radiusProp, padding },
        variant === "default" && styles.shadowDefault,
        variant === "soft" && styles.shadowSoft,
        variant === "flat" && styles.flat,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.card,
    overflow: "hidden",
  },
  shadowDefault: {
    ...Shadow.card,
  },
  shadowSoft: {
    ...Shadow.soft,
  },
  flat: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
