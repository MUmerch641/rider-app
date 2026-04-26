import { isRTL } from "@/constants/i18n";
import { useAppFont } from "@/hooks/useAppFont";
import { radius, scale, spacing, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SvgXml } from "react-native-svg";

// ─── Dollar Icon SVG ──────────────────────────────────────────────────────────
const DOLLAR_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_2039_6482)">
<mask id="mask0_2039_6482" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
<path d="M24 0H0V24H24V0Z" fill="white"/>
</mask>
<g mask="url(#mask0_2039_6482)">
<path d="M13.05 16.2502H11.17C9.84001 16.2502 8.75 15.1302 8.75 13.7502C8.75 13.3402 9.09 13.0002 9.5 13.0002C9.91 13.0002 10.25 13.3402 10.25 13.7502C10.25 14.3002 10.66 14.7502 11.17 14.7502H13.05C13.44 14.7502 13.75 14.4002 13.75 13.9702C13.75 13.4302 13.6 13.3502 13.26 13.2302L10.25 12.1802C9.61 11.9602 8.75 11.4902 8.75 10.0202C8.75 8.77023 9.74001 7.74023 10.95 7.74023H12.83C14.16 7.74023 15.25 8.86023 15.25 10.2402C15.25 10.6502 14.91 10.9902 14.5 10.9902C14.09 10.9902 13.75 10.6502 13.75 10.2402C13.75 9.69023 13.34 9.24023 12.83 9.24023H10.95C10.56 9.24023 10.25 9.59023 10.25 10.0202C10.25 10.5602 10.4 10.6402 10.74 10.7602L13.75 11.8102C14.39 12.0302 15.25 12.5002 15.25 13.9702C15.25 15.2302 14.26 16.2502 13.05 16.2502Z" fill="white"/>
<path d="M12 17.25C11.59 17.25 11.25 16.91 11.25 16.5V7.5C11.25 7.09 11.59 6.75 12 6.75C12.41 6.75 12.75 7.09 12.75 7.5V16.5C12.75 16.91 12.41 17.25 12 17.25Z" fill="white"/>
<path d="M12 22.75C6.07 22.75 1.25 17.93 1.25 12C1.25 6.07 6.07 1.25 12 1.25C12.41 1.25 12.75 1.59 12.75 2C12.75 2.41 12.41 2.75 12 2.75C6.9 2.75 2.75 6.9 2.75 12C2.75 17.1 6.9 21.25 12 21.25C17.1 21.25 21.25 17.1 21.25 12C21.25 11.59 21.59 11.25 22 11.25C22.41 11.25 22.75 11.59 22.75 12C22.75 17.93 17.93 22.75 12 22.75Z" fill="white"/>
<path d="M21 7.75H17C16.59 7.75 16.25 7.41 16.25 7V3C16.25 2.59 16.59 2.25 17 2.25C17.41 2.25 17.75 2.59 17.75 3V6.25H21C21.41 6.25 21.75 6.59 21.75 7C21.75 7.41 21.41 7.75 21 7.75Z" fill="white"/>
<path d="M16.9999 7.75043C16.8099 7.75043 16.6199 7.68043 16.4699 7.53043C16.1799 7.24043 16.1799 6.76043 16.4699 6.47043L21.4699 1.47043C21.7599 1.18043 22.2399 1.18043 22.5299 1.47043C22.8199 1.76043 22.8199 2.24043 22.5299 2.53043L17.5299 7.53043C17.3799 7.68043 17.1899 7.75043 16.9999 7.75043Z" fill="white"/>
</g>
</g>
<defs>
<clipPath id="clip0_2039_6482">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>`;

// ─── Constants ────────────────────────────────────────────────────────────────
const HEADER_ROW_HEIGHT = verticalScale(64);
const EARNINGS_PANEL_HEIGHT = verticalScale(150);
const COLLAPSED_HEIGHT = HEADER_ROW_HEIGHT;
const EXPANDED_HEIGHT = HEADER_ROW_HEIGHT + EARNINGS_PANEL_HEIGHT;

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrderHeaderProps {
  orderNumber: string | number;
  statusKey?: string;
  statusFallback?: string;
  estimatedEarnings: number;
  currencyKey?: string;
  currencyFallback?: string;
  onBack: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function OrderHeader({
  orderNumber,
  statusKey = "orderHeader.activeDelivery",
  statusFallback = "ACTIVE DELIVERY",
  estimatedEarnings,
  currencyKey = "common.iqd",
  currencyFallback = "IQD",
  onBack,
}: OrderHeaderProps) {
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const rtl = isRTL(i18n.language);

  const [expanded, setExpanded] = useState(false);

  // ── Animated values ────────────────────────────────────────────────────────
  const heightAnim = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const earningsOpacity = useRef(new Animated.Value(0)).current;
  const earningsTranslateY = useRef(new Animated.Value(-10)).current;
  const dividerOpacity = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const iconBgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (expanded) {
      // 1. Expand the container first
      Animated.spring(heightAnim, {
        toValue: EXPANDED_HEIGHT,
        useNativeDriver: false,
        damping: 20,
        stiffness: 160,
        mass: 0.8,
      }).start();

      // 2. Fade in divider quickly
      Animated.timing(dividerOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: false,
      }).start();

      // 3. Slide + fade in earnings content slightly delayed
      Animated.parallel([
        Animated.timing(earningsOpacity, {
          toValue: 1,
          duration: 220,
          delay: 80,
          useNativeDriver: true,
        }),
        Animated.spring(earningsTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 200,
          delay: 80,
        } as any),
      ]).start();
    } else {
      // Fade out content first, then collapse
      Animated.parallel([
        Animated.timing(earningsOpacity, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(dividerOpacity, {
          toValue: 0,
          duration: 140,
          useNativeDriver: false,
        }),
        Animated.timing(earningsTranslateY, {
          toValue: -10,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Collapse after content fades
        Animated.spring(heightAnim, {
          toValue: COLLAPSED_HEIGHT,
          useNativeDriver: false,
          damping: 20,
          stiffness: 180,
        }).start();
      });
    }

    // Icon rotate
    Animated.spring(rotateAnim, {
      toValue: expanded ? 1 : 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 180,
    }).start();

    // Icon bg color
    Animated.timing(iconBgAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  const rotateDeg = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  const iconBgColor = iconBgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#2a2a2a", "#3d2060"],
  });

  return (
    <TouchableOpacity
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.9}
    >
      <View style={styles.wrapper}>
        {/* Single unified animated container */}
        <Animated.View style={[styles.card, { height: heightAnim }]}>
          {/* ── Header row ── */}
          <View
            style={[
              styles.headerRow,
              { flexDirection: rtl ? "row-reverse" : "row" },
            ]}
          >
            {/* Back button */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={onBack}
              activeOpacity={0.75}
            >
              <Ionicons
                name={rtl ? "arrow-forward" : "arrow-back"}
                size={scale(20)}
                color="#fff"
              />
            </TouchableOpacity>

            {/* Center — order title + status */}
            <View style={styles.centerBlock}>
              <Text
                style={[
                  styles.orderTitle,
                  { fontFamily: font.bold, letterSpacing: rtl ? 0 : 0.3 },
                ]}
              >
                {t("orderHeader.order", "Order")} #{orderNumber}
              </Text>
              <Text
                style={[
                  styles.statusLabel,
                  {
                    fontFamily: font.semibold,
                    letterSpacing: rtl ? 0 : scale(1.5),
                  },
                ]}
              >
                {t(statusKey, statusFallback)}
              </Text>
            </View>

            {/* Dollar icon button */}

            <Animated.View
              style={[styles.iconBtn, { backgroundColor: iconBgColor }]}
            >
              <Animated.View style={{ transform: [{ rotate: rotateDeg }] }}>
                <SvgXml xml={DOLLAR_SVG} width={scale(22)} height={scale(22)} />
              </Animated.View>
            </Animated.View>
          </View>
          {/* ── Earnings panel ── */}
          <Animated.View
            style={{
              opacity: earningsOpacity,
              transform: [{ translateY: earningsTranslateY }],
            }}
          >
            <LinearGradient
              colors={
                rtl
                  ? ["#121212", "#121212", "#121212", "#7e22ce21"]
                  : ["#7E22CE33", "#121212", "#121212", "#121212"]
              }
              locations={rtl ? [1, 0.75, 0.4, 0] : [0, 0.4, 0.75, 1]}
              start={{ x: rtl ? 0 : 1.1, y: 0.5 }}
              end={{ x: rtl ? 0.8 : 0, y: 0.5 }}
              style={[
                styles.earningsPanel,
                {
                  alignItems: rtl ? "flex-end" : "flex-start",
                },
              ]}
            >
              <Text
                style={[
                  styles.earningsLabel,
                  {
                    fontFamily: font.semibold,
                    textAlign: rtl ? "right" : "left",
                    letterSpacing: rtl ? 0 : scale(1.2),
                  },
                ]}
              >
                {t("orderHeader.estimatedEarnings", "ESTIMATED EARNINGS")}
              </Text>

              <View
                style={[
                  styles.earningsAmountRow,
                  { flexDirection: rtl ? "row-reverse" : "row" },
                ]}
              >
                <Text
                  style={[styles.earningsAmount, { fontFamily: font.bold }]}
                >
                  {estimatedEarnings.toLocaleString()}
                </Text>
                <Text
                  style={[
                    styles.earningsCurrency,
                    { fontFamily: font.semibold },
                  ]}
                >
                  {t(currencyKey, currencyFallback)}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },

  // Single unified dark card
  card: {
    backgroundColor: "#0C0C0C",
    borderRadius: radius.xxl + scale(25),
    overflow: "hidden",
    justifyContent: "flex-start",
    padding: scale(15),
    paddingBottom: scale(80),
  },

  // Header row
  headerRow: {
    height: HEADER_ROW_HEIGHT,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Icon buttons
  iconBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },

  // Center block
  centerBlock: {
    flex: 1,
    alignItems: "center",
    gap: verticalScale(2),
  },
  orderTitle: {
    fontSize: scale(17),
    color: "#ffffff",
  },
  statusLabel: {
    fontSize: scale(11),
    color: "#9B59FF",
    textTransform: "uppercase",
  },

  // Earnings panel
  earningsPanel: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: verticalScale(4),
    borderColor: "#FFFFFF0D",
    borderWidth: 1,
    borderRadius: radius.xxl + scale(15),
  },
  earningsLabel: {
    fontSize: scale(11),
    color: "#666",
    textTransform: "uppercase",
  },
  earningsAmountRow: {
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingBottom: scale(15),
  },
  earningsAmount: {
    fontSize: scale(34),
    color: "#9B59FF",
    lineHeight: scale(45),
  },
  earningsCurrency: {
    fontSize: scale(16),
    marginBottom: verticalScale(10),
    color: "#9B59FF",
  },
});
