import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

interface EditableFieldProps {
  label: string;
  value: string;
  onPress: () => void;
  style?: ViewStyle;
}

export function EditableField({
  label,
  value,
  onPress,
  style,
}: EditableFieldProps) {
  const font = useAppFont();

  return (
    // Native RTL mirrors the row and text alignment automatically.
    <View style={[styles.wrapper, style]}>
      <Text style={[styles.label, { fontFamily: font.regular }]}>{label}</Text>
      <TouchableOpacity
        style={styles.field}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[styles.value, { fontFamily: font.semibold, flex: 1 }]}>
          {value}
        </Text>
        <Ionicons
          name="pencil-outline"
          size={scale(18)}
          color={Colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.xs },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  field: {
    flexDirection: "row",
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md + verticalScale(2),
    alignItems: "center",
  },
  value: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
});
