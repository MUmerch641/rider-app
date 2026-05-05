import { isRTL } from "@/constants/i18n";
import { Colors } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import {
  fontSize,
  radius,
  scale,
  spacing,
  verticalScale,
} from "@/utils/responsive";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Svg, {
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Responsive chart width: accounts for horizontal margins from spacing tokens
const CHART_WIDTH = SCREEN_WIDTH - spacing.md * 2 - spacing.md * 2;
const CHART_HEIGHT = verticalScale(160);

type ChartTab = "revenue" | "order" | "profit";

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const cp1x = (points[i].x + points[i + 1].x) / 2;
    d += ` C ${cp1x} ${points[i].y} ${cp1x} ${points[i + 1].y} ${points[i + 1].x} ${points[i + 1].y}`;
  }
  return d;
}

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const DATA: Record<ChartTab, number[]> = {
  revenue: [40, 55, 35, 70, 50, 100, 65, 80, 45, 60, 75, 50],
  order: [30, 45, 60, 40, 70, 55, 80, 50, 65, 45, 70, 55],
  profit: [20, 40, 55, 35, 65, 45, 70, 40, 60, 35, 65, 45],
};

export interface SalesChartData {
  revenue: number[];
  order: number[];
  profit: number[];
  /** Optional override for X-axis labels. Defaults to MONTHS (12 months Jan–Dec). */
  monthLabels?: string[];
}

interface SalesChartProps {
  onFullReport?: () => void;
  style?: ViewStyle;
  /** Live data for the three tabs. When omitted, the component renders mock data. */
  data?: SalesChartData;
}

export function SalesChart({ onFullReport, style, data: dataProp }: SalesChartProps) {
  const font = useAppFont();
  const { t, i18n } = useTranslation();
  const rtl = isRTL(i18n.language);

  const [activeTab, setActiveTab] = useState<ChartTab>("revenue");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const TABS = [
    { key: "revenue", label: t("revenue.revenue") },
    { key: "order", label: t("revenue.order") },
    { key: "profit", label: t("revenue.profit") },
  ];

  const dataMap: Record<ChartTab, number[]> = dataProp
    ? { revenue: dataProp.revenue, order: dataProp.order, profit: dataProp.profit }
    : DATA;
  const data = dataMap[activeTab];
  // Guard against an all-zero series (e.g. no deliveries this year for the active tab)
  // — Math.max(...[0,0,...]) = 0 would NaN the SVG path. Floor at 1 to keep a flat baseline.
  const maxVal = Math.max(1, ...data);

  const padding = {
    top: verticalScale(30),
    bottom: verticalScale(30),
    left: scale(10),
    right: scale(10),
  };
  const w = CHART_WIDTH - padding.left - padding.right;
  const h = CHART_HEIGHT - padding.top - padding.bottom;

  const points = data.map((val, i) => ({
    x: padding.left + (i / (data.length - 1)) * w,
    y: padding.top + h - (val / maxVal) * h,
  }));

  const linePath = smoothPath(points);

  const fillPath = `${linePath}
    L ${points[points.length - 1].x} ${CHART_HEIGHT - padding.bottom}
    L ${points[0].x} ${CHART_HEIGHT - padding.bottom} Z`;

  const handleTouch = (x: number) => {
    const relativeX = x - padding.left;
    const index = Math.round((relativeX / w) * (data.length - 1));
    if (index >= 0 && index < data.length) setActiveIndex(index);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => handleTouch(e.nativeEvent.locationX),
    onPanResponderMove: (e) => handleTouch(e.nativeEvent.locationX),
    onPanResponderRelease: () => {},
  });

  // Tooltip pill dimensions — scaled
  const pillW = scale(66);
  const pillH = scale(26);
  const pillR = scale(13);

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View
        style={[styles.header, { flexDirection: rtl ? "row-reverse" : "row" }]}
      >
        <Text style={[styles.title, { fontFamily: font.regular }]}>
          {t("revenue.salesOverview")}
        </Text>
        <TouchableOpacity onPress={onFullReport}>
          <Text style={[styles.fullReport, { fontFamily: font.semibold }]}>
            {t("revenue.fullReport")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chart Card */}
      <View style={styles.chartCard}>
        {/* Tabs */}
        <View
          style={[
            styles.subTabs,
            { flexDirection: rtl ? "row-reverse" : "row" },
          ]}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key as ChartTab)}
              style={styles.subTab}
            >
              <Text
                style={[
                  styles.subTabLabel,
                  { fontFamily: font.medium },
                  activeTab === tab.key
                    ? styles.subTabActive
                    : styles.subTabInactive,
                ]}
              >
                {tab.label}
              </Text>
              {activeTab === tab.key && <View style={styles.subTabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* SVG */}
        <View {...panResponder.panHandlers}>
          <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient
                id="paint0_linear_106_991"
                x1="0"
                y1={CHART_HEIGHT}
                x2={CHART_WIDTH}
                y2={CHART_HEIGHT - 10}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0.026" stopColor="white" />
                <Stop offset="0.151" stopColor="#1C5BFF" />
                <Stop offset="0.510" stopColor="#BA4DE4" />
                <Stop offset="0.864" stopColor="#0047FF" />
                <Stop offset="1" stopColor="white" />
              </LinearGradient>
              <LinearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={Colors.primary} stopOpacity="0.3" />
                <Stop
                  offset="1"
                  stopColor={Colors.primaryLight}
                  stopOpacity="0.02"
                />
              </LinearGradient>
            </Defs>

            <Path d={fillPath} fill="url(#fillGrad)" />
            <Path
              d={linePath}
              fill="none"
              stroke="url(#paint0_linear_106_991)"
              strokeWidth={scale(2.5)}
            />

            {activeIndex !== null && (
              <>
                <Line
                  x1={points[activeIndex].x}
                  y1={padding.top}
                  x2={points[activeIndex].x}
                  y2={CHART_HEIGHT - padding.bottom}
                  stroke="#E0E0E0"
                  strokeWidth={1}
                />
                <Path
                  d={`M ${points[activeIndex].x} ${points[activeIndex].y}
                      m -${scale(4)},0 a ${scale(4)},${scale(4)} 0 1,0 ${scale(8)},0 a ${scale(4)},${scale(4)} 0 1,0 -${scale(8)},0`}
                  fill={Colors.primary}
                />
                <G
                  transform={`translate(${points[activeIndex].x - pillW / 2}, ${
                    points[activeIndex].y - pillH - scale(14)
                  })`}
                >
                  <Path
                    d={`M0 ${pillR}
                        Q0 0 ${pillR} 0
                        L${pillW - pillR} 0
                        Q${pillW} 0 ${pillW} ${pillR}
                        L${pillW} ${pillH - pillR}
                        Q${pillW} ${pillH} ${pillW - pillR} ${pillH}
                        L${pillW / 2 + scale(6)} ${pillH}
                        L${pillW / 2} ${pillH + scale(8)}
                        L${pillW / 2 - scale(6)} ${pillH}
                        L${pillR} ${pillH}
                        Q0 ${pillH} 0 ${pillH - pillR} Z`}
                    fill="#7A1FDD"
                  />
                  <SvgText
                    x={pillW / 2}
                    y={pillH * 0.65}
                    textAnchor="middle"
                    fontSize={scale(11)}
                    fontWeight="bold"
                    fill="#fff"
                  >
                    {`$${Math.round(data[activeIndex] * 200).toLocaleString()}`}
                  </SvgText>
                </G>
              </>
            )}
          </Svg>
        </View>

        {/* Month labels */}
        <View style={styles.monthsRow}>
          {(dataProp?.monthLabels ?? MONTHS).map((m) => (
            <Text
              key={m}
              style={[styles.monthLabel, { fontFamily: font.regular }]}
            >
              {m}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: { fontSize: fontSize.lg, color: Colors.textPrimary },
  fullReport: { fontSize: fontSize.sm, color: Colors.textSecondary },
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: Colors.inputBg,
  },
  subTabs: { gap: spacing.lg, marginBottom: spacing.xl },
  subTab: { alignItems: "center" },
  subTabLabel: { fontSize: fontSize.md },
  subTabActive: { color: Colors.primary },
  subTabInactive: { color: Colors.textSecondary },
  subTabUnderline: {
    height: scale(2),
    backgroundColor: Colors.primary,
    marginTop: scale(4),
    borderRadius: radius.full,
    width: "100%",
  },
  monthsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  monthLabel: {
    fontSize: scale(8),
    color: Colors.textMuted,
  },
});
