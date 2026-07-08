// StarRating.tsx
import { Colors, FontWeight, Spacing } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StarRatingIcon } from "./icons";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  showLabel?: boolean;
}

export function StarRating({
  rating,
  maxStars = 5,
  size = 20,
  interactive = false,
  onRate,
  showLabel = false,
}: StarRatingProps) {
  const font = useAppFont();

  const stars = Array.from({ length: maxStars }, (_, i) => {
    const filled = i + 1 <= Math.floor(rating);
    const half = !filled && i < rating && rating % 1 >= 0.5;
    const variant = filled ? "filled" : half ? "half" : "empty";
    return { index: i, variant: variant as "filled" | "half" | "empty" };
  });

  return (
    <View style={[styles.row, { flexDirection: font.rtl ? "row-reverse" : "row" }]}>
      {stars.map(({ index, variant }) => {
        if (interactive) {
          return (
            <TouchableOpacity
              key={index}
              onPress={() => onRate?.(index + 1)}
              activeOpacity={0.7}
            >
              <StarRatingIcon size={size} variant={variant} />
            </TouchableOpacity>
          );
        }
        return <StarRatingIcon key={index} size={size} variant={variant} />;
      })}
      {showLabel && (
        <Text
          style={[
            styles.label,
            { fontSize: size * 0.75, fontFamily: font.bold, marginLeft: font.rtl ? 0 : Spacing.xs, marginRight: font.rtl ? Spacing.xs : 0 },
          ]}
        >
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  label: {
    color: Colors.accent,
    fontWeight: FontWeight.bold,
    marginLeft: Spacing.xs,
  },
});
