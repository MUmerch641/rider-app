import { useAppFont } from "@/hooks/useAppFont";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  I18nManager,
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  TouchableOpacity,
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
  /** Tap handler for the avatar (change profile photo). Adds a camera badge. */
  onAvatarPress?: () => void;
  /** Shows a spinner over the avatar while the new photo uploads. */
  avatarUploading?: boolean;
  /** Optional extra style for the outer card */
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function DriverBalanceCard({
  name,
  phone,
  balance,
  avatar,
  onAvatarPress,
  avatarUploading = false,
  style,
}: DriverBalanceCardProps) {
  const { t } = useTranslation();
  const font = useAppFont();

  const avatarBody = (
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
      {avatarUploading && (
        <View style={styles.avatarLoading}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      )}
      {!!onAvatarPress && !avatarUploading && (
        <View style={styles.avatarBadge}>
          <Ionicons name="camera" size={scale(11)} color="#FFFFFF" />
        </View>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={["#ffffffce", "#e6dcfa", "#faf6f6", "#fadecd"]}
      // Gradient coords don't auto-mirror under native RTL — flip manually.
      start={{ x: I18nManager.isRTL ? 1.2 : 0, y: 0 }}
      end={{ x: I18nManager.isRTL ? 0 : 1, y: 1 }}
      style={[styles.card, style]}
    >
      {/* ── Driver info row — native RTL mirrors the row automatically ── */}
      <View style={styles.infoRow}>
        {/* Avatar with white ring (tappable when onAvatarPress is provided) */}
        {onAvatarPress ? (
          <TouchableOpacity
            onPress={onAvatarPress}
            disabled={avatarUploading}
            activeOpacity={0.75}
            accessibilityLabel={t("personalInfo.changePhoto", "Change photo")}
          >
            {avatarBody}
          </TouchableOpacity>
        ) : (
          avatarBody
        )}

        {/* Name + phone */}
        <View style={styles.driverInfo}>
          <Text
            style={[styles.driverName, { fontFamily: font.bold }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text style={[styles.driverPhone, { fontFamily: font.regular }]}>
            {phone}
          </Text>
        </View>
      </View>

      {/* ── Balance section ── */}
      <View style={styles.balanceSection}>
        <Text style={[styles.balanceLabel, { fontFamily: font.regular }]}>
          {t("driverCard.availableBalance", "Available Balance")}
        </Text>

        <View style={styles.amountRow}>
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

  infoRow: {
    flexDirection: "row",
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
  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: scale(28),
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: "#5E28C6",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  // Name + phone
  driverInfo: {
    flex: 1,
    gap: verticalScale(3),
    marginHorizontal: scale(10),
    alignItems: "flex-start",
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
    alignItems: "flex-start",
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
    flexDirection: "row",
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
