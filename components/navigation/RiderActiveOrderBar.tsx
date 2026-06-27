import { SafeImage } from "@/components/SafeImage";
import { Colors } from "@/constants/theme";
import { useActiveAssignments } from "@/context/ActiveAssignmentsContext";
import { useAppFont } from "@/hooks/useAppFont";
import { localizeName, type LangKey } from "@/utils/localize";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  /** Hide on the map tab — the accepted-orders sheet already covers it. */
  hidden?: boolean;
};

export default function RiderActiveOrderBar({ hidden }: Props) {
  const { activeAssignments, primaryAssignment, showAssignmentSummary } =
    useActiveAssignments();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const rtl = font.rtl;
  const langKey = (i18n.language?.split("-")[0] || "en") as LangKey;

  const openMap = useCallback(() => {
    router.push("/(tabs)/onmap");
  }, [router]);

  if (hidden || !primaryAssignment) return null;

  const storeName = localizeName(
    primaryAssignment.order?.store?.name,
    langKey,
  );
  const statusLabel = t(`orders.status.${primaryAssignment.status}`, {
    defaultValue: primaryAssignment.status,
  });
  const count = activeAssignments.length;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={openMap}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel={t("activeOrders.barA11y", {
        store: storeName,
        status: statusLabel,
      })}
    >
      <View style={[styles.row, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <View
          style={[
            styles.avatarStack,
            { flexDirection: rtl ? "row-reverse" : "row" },
          ]}
        >
          {activeAssignments.slice(0, 2).map((a, i) => (
            <View
              key={a.orderId}
              style={[
                styles.avatarRing,
                i > 0 && (rtl ? { marginRight: -10 } : { marginLeft: -10 }),
              ]}
            >
              <SafeImage
                uri={a.order?.store?.avatar}
                variant="store"
                style={styles.avatar}
                contentFit="cover"
              />
            </View>
          ))}
          <View
            style={[
              styles.liveDot,
              rtl ? { left: 0, right: undefined } : { right: 0, left: undefined },
            ]}
          />
        </View>

        <View
          style={[
            styles.textCol,
            { alignItems: rtl ? "flex-end" : "flex-start" },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[styles.storeName, { fontFamily: font.semibold }]}
          >
            {storeName}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.statusLine, { fontFamily: font.regular }]}
          >
            {count > 1
              ? t("activeOrders.multiple", { count, status: statusLabel })
              : statusLabel}
          </Text>
        </View>

        <TouchableOpacity
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation?.();
            showAssignmentSummary(primaryAssignment);
          }}
          style={styles.detailsBtn}
          accessibilityLabel={t("activeOrders.viewDetails")}
        >
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={Colors.primary}
          />
        </TouchableOpacity>

        <View
          style={[
            styles.mapBtn,
            { flexDirection: rtl ? "row-reverse" : "row" },
          ]}
        >
          <Text style={[styles.mapLabel, { fontFamily: font.medium }]}>
            {t("activeOrders.openMap")}
          </Text>
          <Ionicons
            name={rtl ? "chevron-back" : "chevron-forward"}
            size={16}
            color={Colors.primary}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: 14,
    backgroundColor: "#F3EDFF",
    borderWidth: 1,
    borderColor: "#E4D6FF",
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  row: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  avatarStack: {
    alignItems: "center",
    position: "relative",
    paddingRight: 4,
  },
  avatarRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#F3EDFF",
    overflow: "hidden",
    backgroundColor: Colors.white,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  liveDot: {
    position: "absolute",
    bottom: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: "#F3EDFF",
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  storeName: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  statusLine: {
    fontSize: 12,
    color: Colors.primary,
  },
  detailsBtn: {
    padding: 4,
  },
  mapBtn: {
    alignItems: "center",
    gap: 2,
  },
  mapLabel: {
    fontSize: 12,
    color: Colors.primary,
  },
});
