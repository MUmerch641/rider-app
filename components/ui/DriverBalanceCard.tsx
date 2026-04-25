import { isRTL } from "@/constants/i18n";
import { useAppFont } from "@/hooks/useAppFont";
import { scale, verticalScale } from "@/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DriverBalanceCardProps {
  /** Driver full name */
  name: string;
  /** Driver phone number */
  phone: string;
  /** Available balance amount */
  balance: number;
  /** Avatar image source */
  avatar?: ImageSourcePropType;
  /** Optional extra style for the outer card */
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function DriverBalanceCard({
  name,
  phone,
  balance,
  avatar,
  style,
}: DriverBalanceCardProps) {
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
      {/* ── Driver info row ── */}
      <View style={[{ flexDirection: rtl ? "row-reverse" : "row" }]}>
        {/* Avatar with white ring */}
        <View style={styles.avatarRing}>
          {avatar ? (
            <Image source={avatar} style={styles.avatar} resizeMode="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={[styles.avatarInitial, { fontFamily: font.bold }]}>
                {name?.charAt(0)?.toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
        </View>

        {/* Name + phone */}
        <View
          style={[
            styles.driverInfo,
            { alignItems: rtl ? "flex-end" : "flex-start" },
          ]}
        >
          <Text
            style={[
              styles.driverName,
              { fontFamily: font.bold, textAlign: rtl ? "right" : "left" },
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text
            style={[
              styles.driverPhone,
              { fontFamily: font.regular, textAlign: rtl ? "right" : "left" },
            ]}
          >
            {phone}
          </Text>
        </View>
      </View>

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
          {t("driverCard.availableBalance", "Available Balance")}
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
    paddingTop: scale(20),
    paddingBottom: scale(26),
    margin: scale(5),
    overflow: "hidden",
  },

  // Avatar + white ring
  avatarRing: {
    borderRadius: scale(32),
    padding: scale(1),
    backgroundColor: "#FFFFFF",
  },
  avatar: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
  },
  avatarPlaceholder: {
    backgroundColor: "#C8BEF0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: scale(22),
    color: "#FFFFFF",
  },

  // Name + phone
  driverInfo: {
    flex: 1,
    gap: verticalScale(3),
    marginHorizontal: scale(10),
  },
  driverName: {
    fontSize: scale(17),
    color: "#1A1A2E",
    letterSpacing: 0.1,
  },
  driverPhone: {
    fontSize: scale(13),
    color: "#9A9AAF",
    letterSpacing: 0.3,
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
