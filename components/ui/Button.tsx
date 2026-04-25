import { Colors, FontWeight } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { fontSize, radius, spacing, verticalScale } from "@/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success"
  | "dark";

type Size = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "lg",
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  style,
  textStyle,
  fullWidth = true,
}: ButtonProps) {
  const font = useAppFont();
  const isDisabled = disabled || loading;

  const sizeMap: Record<
    Size,
    { height: number; fontSize: number; px: number }
  > = {
    sm: { height: verticalScale(36), fontSize: fontSize.sm, px: spacing.md },
    md: { height: verticalScale(46), fontSize: fontSize.md, px: spacing.lg },
    lg: { height: verticalScale(56), fontSize: fontSize.lg, px: spacing.xl },
  };

  const s = sizeMap[size];

  const bgColor: Record<Exclude<Variant, "primary">, string> = {
    secondary: Colors.inputBg,
    outline: Colors.card,
    ghost: "transparent",
    danger: Colors.danger,
    success: Colors.success,
    dark: Colors.dark,
  };

  const fgColor: Record<Variant, string> = {
    primary: Colors.textInverse,
    secondary: Colors.textPrimary,
    outline: Colors.textPrimary,
    ghost: Colors.reject,
    danger: Colors.textInverse,
    success: Colors.textInverse,
    dark: Colors.textInverse,
  };

  const content = (
    <>
      {loading ? (
        <ActivityIndicator
          color={
            variant === "outline" || variant === "ghost"
              ? Colors.primary
              : "#fff"
          }
        />
      ) : (
        <>
          {iconLeft && <View style={styles.iconLeft}>{iconLeft}</View>}
          {!!label && (
            <Text
              style={[
                styles.text,
                {
                  fontSize: s.fontSize,
                  color: fgColor[variant],
                  fontFamily: font.medium,
                },
                textStyle,
              ]}
            >
              {label}
            </Text>
          )}
          {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
        </>
      )}
    </>
  );

  if (variant === "primary") {
    return (
      <LinearGradient
        colors={
          isDisabled
            ? ["#9559ceec", "#ad7cdaee", "#cabaf0", "#ad7cdaee", "#9559ceec"]
            : ["#BA97FF", "#8140FF", "#BC99FF"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.gradient,
          { height: s.height },
          fullWidth && styles.fullWidth,
          style,
        ]}
      >
        <TouchableOpacity
          onPress={onPress}
          disabled={isDisabled}
          activeOpacity={0.85}
          style={styles.gradientInner}
        >
          {content}
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
      style={[
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.px,
          backgroundColor: isDisabled
            ? Colors.border
            : bgColor[variant as Exclude<Variant, "primary">],
          borderRadius: radius.md,
        },
        variant === "outline" && styles.outlineBorder,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  gradientInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: {
    width: "100%",
  },
  outlineBorder: {
    borderWidth: 1.5,
    borderColor: Colors.borderButton,
  },
  text: {
    fontWeight: FontWeight.medium,
    textAlign: "center",
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});
