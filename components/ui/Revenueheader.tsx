import { Colors, Shadow } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import {
  fontSize,
  iconSize,
  radius,
  scale,
  spacing,
  verticalScale,
} from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { SafeImage } from "@/components/SafeImage";
import { CalendarIcon } from "./icons";

const PERIODS = [
  "revenue.today",
  "revenue.thisWeek",
  "revenue.thisMonth",
  "revenue.thisYear",
];

interface RevenueHeaderProps {
  restaurantName: string;
  restaurantId: string;
  logoUrl?: string;
  isOpen: boolean;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  style?: ViewStyle;
}

export function RevenueHeader({
  restaurantName,
  restaurantId,
  logoUrl,
  isOpen,
  selectedPeriod,
  onPeriodChange,
  style,
}: RevenueHeaderProps) {
  const font = useAppFont();
  const { t } = useTranslation();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  return (
    // Native RTL mirrors rows, alignment, and absolute offsets automatically.
    <View
      style={[
        styles.container,
        { backgroundColor: Colors.background },
        style,
      ]}
    >
      {/* Restaurant Info */}
      <View style={styles.infoRow}>
        {logoUrl ? (
          <SafeImage uri={logoUrl} variant="store" style={styles.logo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Ionicons name="flame" size={iconSize.md} color={Colors.primary} />
          </View>
        )}
        <View style={styles.infoText}>
          <Text style={[styles.restaurantName, { fontFamily: font.bold }]}>
            {restaurantName}
          </Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.dot,
                { backgroundColor: isOpen ? Colors.success : Colors.danger },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  fontFamily: font.regular,
                  color: isOpen ? Colors.success : Colors.danger,
                },
              ]}
            >
              {isOpen ? t("common.open") : t("common.close")}
            </Text>
            <Text style={[styles.restaurantId, { fontFamily: font.regular }]}>
              #{restaurantId}
            </Text>
          </View>
        </View>
      </View>

      {/* Period Selector */}
      <TouchableOpacity
        style={styles.periodBtn}
        onPress={() => setDropdownVisible(true)}
        activeOpacity={0.8}
      >
        <CalendarIcon size={iconSize.xs} color={Colors.textSecondary} />
        <Text style={[styles.periodText, { fontFamily: font.medium }]}>
          {t(selectedPeriod)}
        </Text>
        <Ionicons
          name="chevron-down"
          size={iconSize.xs}
          color={Colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Dropdown */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.dropdown}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.dropdownItem,
                  p === selectedPeriod && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  onPeriodChange(p);
                  setDropdownVisible(false);
                }}
                activeOpacity={0.75}
              >
                {p === selectedPeriod && (
                  <Ionicons
                    name="checkmark"
                    size={iconSize.xs}
                    color={Colors.primary}
                  />
                )}
                <Text
                  style={[
                    styles.dropdownText,
                    {
                      fontFamily:
                        p === selectedPeriod ? font.semibold : font.regular,
                    },
                    p === selectedPeriod && styles.dropdownTextActive,
                  ]}
                >
                  {t(p)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    top: -verticalScale(50),
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  logo: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    borderWidth: 0.5,
    backgroundColor: Colors.inputBg,
  },
  logoPlaceholder: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    backgroundColor: Colors.inputBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: { gap: scale(2), alignItems: "flex-start" },
  restaurantName: { fontSize: fontSize.md, color: Colors.textPrimary },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  dot: { width: scale(8), height: scale(8), borderRadius: scale(4) },
  statusText: { fontSize: fontSize.xs },
  restaurantId: { fontSize: fontSize.xs, color: Colors.textMuted },
  periodBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: Colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  periodText: { fontSize: fontSize.sm, color: Colors.textSecondary },
  dropdownOverlay: { flex: 1 },
  dropdown: {
    position: "absolute",
    top: verticalScale(165),
    right: spacing.md,
    backgroundColor: Colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    minWidth: scale(160),
    ...Shadow.card,
  },
  dropdownItem: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: "center",
    gap: spacing.xs,
  },
  dropdownItemActive: { backgroundColor: "#F3EEFF" },
  dropdownText: {
    fontSize: fontSize.md,
    color: Colors.textSecondary,
    flex: 1,
  },
  dropdownTextActive: { color: Colors.primary },
});
