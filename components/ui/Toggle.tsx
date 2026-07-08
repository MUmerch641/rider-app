import { Colors, FontSize, FontWeight } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

interface ToggleProps {
  value: boolean;
  onToggle: (value: boolean) => void;
  label?: string;
  style?: ViewStyle;
  colorOn?: string;
  colorOff?: string;
}

export function Toggle({
  value,
  onToggle,
  label,
  style,
  colorOn = Colors.success,
  colorOff = Colors.danger,
}: ToggleProps) {
  const font = useAppFont();
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  }, [value]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });
  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colorOff, colorOn],
  });

  return (
    <View style={[styles.row, style, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
      {label && (
        <Text style={[styles.label, { fontFamily: font.medium, textAlign: font.rtl ? "right" : "left" }]}>{label}</Text>
      )}
      <TouchableOpacity onPress={() => onToggle(!value)} activeOpacity={0.85}>
        <Animated.View style={[styles.track, { backgroundColor: bgColor }]}>
          <Animated.View
            style={[styles.thumb, { transform: [{ translateX }] }]}
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    flex: 1,
  },
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
