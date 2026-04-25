import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { isRTL } from "@/constants/i18n";
import { useAppFont } from "@/hooks/useAppFont";
import { scale, verticalScale } from "@/utils/responsive";

type StatCircleCardProps = {
  label: string; // translation key
  value: string | number;
  progress: number; // 0 - 100
};

const SIZE = scale(72);
const STROKE_WIDTH = scale(6);
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function StatCircleCard({
  label,
  value,
  progress,
}: StatCircleCardProps) {
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const rtl = isRTL(i18n.language);

  const safeProgress = Math.max(0, Math.min(100, progress));
  const dashOffset = CIRCUMFERENCE - (CIRCUMFERENCE * safeProgress) / 100;

  return (
    <View style={styles.card}>
      <View style={styles.chartWrap}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="#7E22CE14"
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="#7900F3"
            strokeWidth={STROKE_WIDTH}
            fill="#ad87cf14"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </Svg>

        <View style={styles.centerTextWrap} pointerEvents="none">
          <Text
            style={[
              styles.valueText,
              {
                fontFamily: font.semibold,
                writingDirection: rtl ? "rtl" : "ltr",
              },
            ]}
          >
            %{value}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.label,
          {
            fontFamily: font.regular,
            textAlign: "center",
            writingDirection: rtl ? "rtl" : "ltr",
          },
        ]}
        numberOfLines={1}
      >
        {t(label)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: scale(130),
    height: verticalScale(150),
    backgroundColor: "#FBFBFB",
    borderRadius: scale(22),
    alignItems: "center",
    justifyContent: "center",
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(16),
    paddingHorizontal: scale(10),
  },
  chartWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(14),
  },
  centerTextWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  valueText: {
    fontSize: scale(17),
    color: "#111111",
  },
  label: {
    fontSize: scale(18),
    color: "#1A1A1A",
  },
});
