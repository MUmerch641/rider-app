import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useAppFont } from "@/hooks/useAppFont";
import { scale } from "@/utils/responsive";

// A small countdown ring that counts down to the merchant's `estimatedReadyAt`
// (ISO datetime). The ring fills/empties relative to the time WINDOW between
// when the rider first sees the order and the ready time, and the center shows
// the remaining time as mm:ss (or "Ready" once the deadline passes).
//
// Reuses the same react-native-svg <Circle> stroke-dashoffset technique as
// StatCircleCard so the visual language matches the rest of the app.

type PrepCountdownRingProps = {
  // ISO 8601 datetime the merchant expects the order to be ready.
  readyAt: string;
  // Label rendered under the ring (already translated by the caller).
  label: string;
  // "Ready" text shown in the center once the deadline passes.
  readyLabel: string;
  // When true, show the green "Ready" badge regardless of the countdown clock.
  forceReady?: boolean;
};

const SIZE = scale(54);
const STROKE_WIDTH = scale(4);
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function format(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.round(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function PrepCountdownRing({
  readyAt,
  label,
  readyLabel,
  forceReady = false,
}: PrepCountdownRingProps) {
  const font = useAppFont();

  const readyTime = useMemo(() => new Date(readyAt).getTime(), [readyAt]);
  // The full window we animate over: from first render until the ready time.
  // Captured per-readyAt so the ring starts full and drains to empty.
  const windowStartRef = useRef(Date.now());
  const windowRef = useRef(Math.max(1, readyTime - Date.now()));
  useEffect(() => {
    windowStartRef.current = Date.now();
    windowRef.current = Math.max(1, readyTime - Date.now());
  }, [readyTime]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = readyTime - now;
  const isReady = forceReady || remainingMs <= 0;
  // Fraction of the window still remaining (1 → full ring, 0 → empty).
  const fraction = Math.max(0, Math.min(1, remainingMs / windowRef.current));
  const dashOffset = CIRCUMFERENCE * (1 - fraction);

  return (
    <View style={styles.wrap}>
      <View style={styles.ringWrap}>
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
            stroke={isReady ? "#22C55E" : "#7900F3"}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={isReady ? 0 : dashOffset}
            // Start the ring at 12 o'clock.
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.centerWrap} pointerEvents="none">
          <Text
            style={[
              styles.centerText,
              { fontFamily: font.semibold },
              isReady && styles.centerTextReady,
            ]}
            numberOfLines={1}
          >
            {isReady ? readyLabel : format(remainingMs)}
          </Text>
        </View>
      </View>
      <Text
        style={[styles.label, { fontFamily: font.regular }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  ringWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  centerWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    fontSize: scale(12),
    color: "#1A1A2E",
  },
  centerTextReady: {
    fontSize: scale(10),
    color: "#22C55E",
  },
  label: {
    marginTop: scale(4),
    fontSize: scale(10),
    color: "#7C7890",
  },
});
