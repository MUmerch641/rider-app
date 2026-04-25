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
  rtl?: boolean;
}

export function EditableField({
  label,
  value,
  onPress,
  style,
  rtl = false,
}: EditableFieldProps) {
  const font = useAppFont();
  const align = rtl ? "right" : "left";

  return (
    <View style={[styles.wrapper, style]}>
      <Text
        style={[styles.label, { fontFamily: font.regular, textAlign: align }]}
      >
        {label}
      </Text>
      <TouchableOpacity
        style={[styles.field, { flexDirection: rtl ? "row-reverse" : "row" }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.value,
            { fontFamily: font.semibold, textAlign: align, flex: 1 },
          ]}
        >
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
