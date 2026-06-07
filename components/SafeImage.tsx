import { Colors } from "@/constants/theme";
import { Image as RNImage } from "expo-image";
import React, { useState } from "react";
import type { ImageStyle, StyleProp } from "react-native";

type Variant = "store" | "food" | "avatar" | "none";

interface SafeImageProps {
  uri?: string | null;
  fallback?: number;
  variant?: Variant;
  style?: StyleProp<ImageStyle>;
  contentFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  testID?: string;
}

const VARIANT_BG: Record<Variant, string> = {
  store: "#EBEBEB",
  food: "#F5F4F8",
  avatar: "#E9E2FF",
  none: "transparent",
};

/**
 * Drop-in `<Image>` that quietly swaps to a tinted placeholder if the remote
 * URL fails to load (404, malformed URI, network drop). Plain `Image` renders
 * nothing on error — fine on iOS, occasionally crashes on Android. Lets the
 * rider app migrate progressively.
 */
export function SafeImage({
  uri,
  fallback,
  variant = "none",
  style,
  contentFit = "cover",
  testID,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  const showFallback = !uri || failed;
  if (showFallback && fallback != null) {
    return (
      <RNImage
        source={fallback}
        style={style}
        contentFit={contentFit}
        testID={testID}
      />
    );
  }

  if (showFallback) {
    return (
      <RNImage
        source={undefined}
        style={[{ backgroundColor: VARIANT_BG[variant] ?? Colors.background }, style]}
        contentFit={contentFit}
        testID={testID}
      />
    );
  }

  return (
    <RNImage
      source={{ uri: uri ?? "" }}
      style={style}
      contentFit={contentFit}
      testID={testID}
      onError={() => setFailed(true)}
    />
  );
}
