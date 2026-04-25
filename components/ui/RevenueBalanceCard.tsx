import { isRTL } from "@/constants/i18n";
import { useAppFont } from "@/hooks/useAppFont";
import { scale, verticalScale } from "@/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RevenueBalanceCardProps {
  /** Available balance amount */
  balance: number;
  /** Optional extra style for the outer card */
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function RevenueBalanceCard({
  balance,
  style,
}: RevenueBalanceCardProps) {
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const rtl = isRTL(i18n.language);

  return (
    <LinearGradient
      colors={["#ffffffce", "#e6dcfa", "#faf6f6", "#fadecd"]}
      start={{ x: rtl ? 1.2 : 0, y: rtl ? 0 : 0 }}
      end={{ x: rtl ? 0 : 1, y: rtl ? 1 : 1 }}
      style={[styles.card, style]}
    >
      {/* ── Balance section ── */}
      <View
        style={[
          styles.balanceSection,
          { alignItems: rtl ? "flex-end" : "flex-start" },
        ]}
      >
        <Text
          style={[
            styles.balanceLabel,
            { fontFamily: font.regular, textAlign: rtl ? "right" : "left" },
          ]}
        >
          {t("driverCard.totalEarning", "Total of Earning")}
        </Text>

        <View
          style={[
            styles.amountRow,
            { flexDirection: rtl ? "row-reverse" : "row" },
          ]}
        >
          <Text style={[styles.balanceAmount, { fontFamily: font.bold }]}>
            {balance.toLocaleString()}
          </Text>
          <Text style={[styles.balanceCurrency, { fontFamily: font.semibold }]}>
            {t("common.iqd", "IQD")}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Outer card — the gradient IS the card ────────────────────────────────
  card: {
    borderRadius: scale(28),
    paddingHorizontal: scale(20),
    paddingBottom: scale(15),
    margin: scale(15),
    overflow: "hidden",
  },

  // ── Balance ───────────────────────────────────────────────────────────────
  balanceSection: {
    gap: verticalScale(8),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 0.2,
    borderRightWidth: 0.2,
    borderTopColor: "white",
    borderBottomColor: "white",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderRadius: scale(30),
    padding: scale(20),
    marginTop: scale(15),
    backgroundColor: "#ffffff46",
  },
  balanceLabel: {
    fontSize: scale(15),
    color: "#A8A4C0",
    letterSpacing: 0.2,
  },
  amountRow: {
    alignItems: "flex-end",
    gap: scale(8),
  },
  balanceAmount: {
    fontSize: scale(36),
    color: "#1A1A2E",
    letterSpacing: -0.5,
    lineHeight: scale(60),
  },
  balanceCurrency: {
    fontSize: scale(16),
    color: "#000",
    marginBottom: verticalScale(14),
    letterSpacing: 0.5,
  },
});
