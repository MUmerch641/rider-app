import { Colors } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { Ionicons } from "@expo/vector-icons"; // or your icon library
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

interface OpenStatusToggleProps {
  isOpen: boolean;
  onToggle: (value: boolean) => void;
  style?: ViewStyle;
}

export function OpenStatusToggle({
  isOpen,
  onToggle,
  style,
}: OpenStatusToggleProps) {
  const font = useAppFont();
  const { t } = useTranslation();
  const anim = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: false,
      bounciness: 5,
    }).start();
  }, [isOpen]);

  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.danger, Colors.success],
  });

  const thumbLeft = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 32],
  });

  return (
    <TouchableOpacity
      onPress={() => onToggle(!isOpen)}
      activeOpacity={0.85}
      style={[style]}
    >
      <Animated.View style={[styles.track, { backgroundColor: bgColor }]}>
        <Animated.View style={[styles.thumb, { left: thumbLeft }]}>
          <Ionicons
            name="power"
            size={18}
            color={isOpen ? Colors.success : Colors.danger}
          />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 63,
    height: 38,
    borderRadius: 60,
    justifyContent: "center",
  },
  thumb: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});
