import { isRTL } from "@/constants/i18n";
import { Colors } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import {
  fontSize,
  iconSize,
  moderateScale,
  radius,
  scale,
  spacing,
} from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

interface TotalRevenueCardProps {
  totalRevenue: number;
  currency: string;
  changePercent: number;
  orders: number;
  netProfit: number;
  commission: number;
  style?: ViewStyle;
}

export function TotalRevenueCard({
  totalRevenue,
  currency,
  changePercent,
  orders,
  netProfit,
  commission,
  style,
}: TotalRevenueCardProps) {
  const font = useAppFont();
  const { t, i18n } = useTranslation();
  const rtl = isRTL(i18n.language);
  const isPositive = changePercent >= 0;
  const [hidden, setHidden] = useState(true);

  const formatK = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

  return (
    <LinearGradient
      colors={["#fdcade", "#fae9f0", "#ffffff", "#e2ddf8", "#d2c9fa"]}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={[styles.card, style]}
    >
      {/* Eye icon */}
      <TouchableOpacity
        style={[
          styles.eyeBtn,
          rtl ? { left: spacing.md, right: undefined } : { right: spacing.md },
        ]}
        onPress={() => setHidden((v) => !v)}
        activeOpacity={0.8}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons
          name={hidden ? "eye-off-outline" : "eye-outline"}
          size={iconSize.md}
          color={Colors.card}
        />
      </TouchableOpacity>

      {/* Label */}
      <Text
        style={[
          styles.label,
          { fontFamily: font.medium, textAlign: rtl ? "right" : "left" },
        ]}
      >
        {t("revenue.totalRevenue")}
      </Text>

      {/* Amount */}
      <View
        style={[
          styles.amountRow,
          { flexDirection: rtl ? "row-reverse" : "row" },
        ]}
      >
        <Text style={[styles.amount, { fontFamily: font.extrabold }]}>
          {hidden ? "••••••" : totalRevenue.toLocaleString()}
        </Text>
        {!hidden && (
          <Text
            style={[
              styles.currency,
              { fontFamily: font.regular, textAlign: rtl ? "right" : "left" },
            ]}
          >
            {currency}
          </Text>
        )}
      </View>

      {/* Change badge */}
      <View
        style={[
          styles.changeBadge,
          {
            flexDirection: rtl ? "row-reverse" : "row",
            alignSelf: rtl ? "flex-end" : "flex-start",
            backgroundColor: isPositive ? "#2DD67033" : "#d65d2d33",
            borderColor: isPositive ? Colors.success : Colors.danger,
          },
        ]}
      >
        <Ionicons
          name={isPositive ? "arrow-up" : "arrow-down"}
          size={iconSize.xs}
          color={isPositive ? Colors.success : Colors.danger}
        />
        <Text
          style={[
            styles.changeText,
            {
              fontFamily: font.semibold,
              color: isPositive ? "#09C454" : "#c40909",
            },
          ]}
        >
          {hidden
            ? "••••"
            : `${isPositive ? "+" : ""}${changePercent}% ${t("revenue.vsLastMonth")}`}
        </Text>
      </View>

      {/* Stats row */}
      <View
        style={[
          styles.statsRow,
          { flexDirection: rtl ? "row-reverse" : "row" },
        ]}
      >
        <View
          style={[
            styles.statItem,
            { alignItems: rtl ? "flex-end" : "flex-start" },
          ]}
        >
          <Text style={[styles.statValue, { fontFamily: font.medium }]}>
            {hidden ? "•••" : orders}
          </Text>
          <Text style={[styles.statLabel, { fontFamily: font.regular }]}>
            {t("revenue.orders")}
          </Text>
        </View>
        <View style={[styles.statItem, { alignItems: "center" }]}>
          <Text style={[styles.statValue, { fontFamily: font.medium }]}>
            {hidden ? "•••" : formatK(netProfit)}
          </Text>
          <Text style={[styles.statLabel, { fontFamily: font.regular }]}>
            {t("revenue.netProfit")}
          </Text>
        </View>
        <View
          style={[
            styles.statItem,
            { alignItems: rtl ? "flex-start" : "flex-end" },
          ]}
        >
          <Text style={[styles.statValue, { fontFamily: font.medium }]}>
            {hidden ? "•••" : formatK(commission)}
          </Text>
          <Text style={[styles.statLabel, { fontFamily: font.regular }]}>
            {t("revenue.commission")}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    position: "relative",
  },
  eyeBtn: {
    backgroundColor: Colors.primaryLight + "33",
    padding: spacing.xs,
    borderRadius: radius.full,
    position: "absolute",
    top: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  amountRow: {
    alignItems: "flex-end",
    gap: scale(4),
  },
  amount: {
    fontSize: moderateScale(28),
    color: Colors.primary,
  },
  currency: {
    fontSize: fontSize.lg,
    color: Colors.textSecondary,
    marginBottom: scale(4),
  },
  changeBadge: {
    alignItems: "center",
    gap: scale(4),
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    borderWidth: 0.2,
  },
  changeText: {
    fontSize: fontSize.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  statsRow: {
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statItem: { flex: 1, gap: scale(2) },
  statValue: { fontSize: fontSize.xxl, color: Colors.textPrimary },
  statLabel: {
    fontSize: fontSize.xs,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
});
