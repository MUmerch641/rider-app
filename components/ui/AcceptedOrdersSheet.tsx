/**
 * AcceptedOrdersSheet
 * ────────────────────────────────────────────────────────────────────
 * Reusable component that shows accepted delivery orders with collapse
 * toggle, RTL support, and full i18n translations.
 *
 * Translation keys to add in your locales:
 *
 * en.json  → orders.acceptedOrders / pickup / dropoff / cancel / delivered / goToRestaurant
 * ar.json  → orders.acceptedOrders:"الطلبات المقبولة" / pickup:"الاستلام" /
 *              dropoff:"التوصيل" / cancel:"إلغاء" / delivered:"تم التسليم" /
 *              goToRestaurant:"اذهب إلى المطعم"
 * ku.json  → orders.acceptedOrders:"داواکارییەکانی قبووڵکراو" / pickup:"وەرگرتن" /
 *              dropoff:"گەیاندن" / cancel:"هەڵوەشاندنەوە" / delivered:"گەیاندرا" /
 *              goToRestaurant:"بڕۆ بۆ ڕستۆرانت"
 *
 * Usage:
 *   <AcceptedOrdersSheet orders={myOrders} />
 *   <AcceptedOrdersSheet orders={myOrders} style={{ borderRadius: 0 }} />
 * ────────────────────────────────────────────────────────────────────
 */

import { isRTL } from "@/constants/i18n";
import { Colors, FontSize } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { fontSize, scale, spacing, verticalScale } from "@/utils/responsive";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { SvgXml } from "react-native-svg";

// ── SVG Icons ──────────────────────────────────────────────────────────────────

const PACKAGE_ICON_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2.69495 7.18506L11.6949 11.1851L12.3049 9.81506L3.30495 5.81506L2.69495 7.18506ZM12.7499 21.5001V10.5001H11.2499V21.5001H12.7499ZM12.3049 11.1851L21.3049 7.18506L20.6949 5.81506L11.6949 9.81506L12.3049 11.1851Z" fill="black"/>
<path d="M3 17.11V6.89001C3.00003 6.77403 3.03367 6.66055 3.09685 6.56329C3.16003 6.46603 3.25005 6.38917 3.356 6.34201L11.756 2.60801C11.8328 2.57382 11.9159 2.55615 12 2.55615C12.0841 2.55615 12.1672 2.57382 12.244 2.60801L20.644 6.34201C20.75 6.38917 20.84 6.46603 20.9032 6.56329C20.9663 6.66055 21 6.77403 21 6.89001V17.11C21 17.226 20.9663 17.3395 20.9032 17.4367C20.84 17.534 20.75 17.6108 20.644 17.658L12.244 21.392C12.1672 21.4262 12.0841 21.4439 12 21.4439C11.9159 21.4439 11.8328 21.4262 11.756 21.392L3.356 17.658C3.25005 17.6108 3.16003 17.534 3.09685 17.4367C3.03367 17.3395 3.00003 17.226 3 17.11Z" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M7.5 4.5L16.144 8.342C16.25 8.38916 16.34 8.46603 16.4032 8.56328C16.4663 8.66054 16.5 8.77402 16.5 8.89V12.5" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
const CHEVRON_DOWN_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M19.25 8.50024L12.25 15.5002L5.25 8.50024" stroke="#0D0B12" stroke-width="1.5" stroke-linecap="square"/>
</svg>
`;

const CHEVRON_UP_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M19.25 15.4998L12.25 8.49976L5.25 15.4998" stroke="#0D0B12" stroke-width="1.5" stroke-linecap="square"/>
</svg>
`;

// ── Types ──────────────────────────────────────────────────────────────────────

export type OrderActionType = "deliver" | "go_to_restaurant";

export interface AcceptedOrderItem {
  /** Unique id for this order */
  id: string;
  /** Restaurant display name */
  restaurantName: string;
  /** Remote URL for the restaurant circular avatar */
  restaurantAvatar?: string;
  /** Formatted price string, e.g. "4,000IQD" */
  price: string;
  /** Short pickup location label */
  pickupLocation: string;
  /** Short drop-off location label. Omit to hide the drop-off point entirely */
  dropoffLocation?: string;
  /** Controls which primary action button is shown */
  actionType: OrderActionType;
  /** Called when user taps "Delivered" (actionType === "deliver") */
  onDeliver?: () => void;
  /** Called when user taps "Go To Restaurant" (actionType === "go_to_restaurant") */
  onGoToRestaurant?: () => void;
  /** Called when user taps "Cancel" */
  onCancel?: () => void;
}

interface AcceptedOrdersSheetProps {
  orders: AcceptedOrderItem[];
  /** Override container styles (background, border-radius, padding…) */
  style?: ViewStyle;
  /** Max scrollable height of the order list. Default: 460 */
  maxHeight?: number;
  /** Start collapsed? Default: false */
  defaultCollapsed?: boolean;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function AcceptedOrdersSheet({
  orders,
  style,
  maxHeight = verticalScale(460),
  defaultCollapsed = true,
}: AcceptedOrdersSheetProps) {
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const rtl = isRTL(i18n.language);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const dir = rtl ? "row-reverse" : "row";

  const hasActiveDelivery = orders.some(
    (order) => order.actionType === "deliver",
  );
  const sortedOrders = [...orders].sort((a, b) => {
    if (a.actionType === "deliver" && b.actionType !== "deliver") return -1;
    if (a.actionType !== "deliver" && b.actionType === "deliver") return 1;
    return 0;
  });
  return (
    <View style={[styles.container, style]}>
      {/* ── Header ── */}
      <View style={[styles.header, { flexDirection: dir }]}>
        {/* Left: icon + title */}
        <View style={[styles.headerLeft, { flexDirection: dir }]}>
          <SvgXml xml={PACKAGE_ICON_SVG} width={scale(22)} height={scale(22)} />
          <Text
            style={[
              styles.headerTitle,
              {
                fontFamily: font.bold,
                textAlign: rtl ? "right" : "left",
              },
            ]}
          >
            {t("orders.acceptedOrders")}
          </Text>
        </View>

        {/* Right: collapse pill with chevron + count */}
        <TouchableOpacity
          style={[styles.collapsePill, { flexDirection: dir }]}
          onPress={() => setCollapsed((v) => !v)}
          activeOpacity={0.72}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <SvgXml
            xml={collapsed ? CHEVRON_UP_SVG : CHEVRON_DOWN_SVG}
            width={scale(24)}
            height={scale(24)}
          />
          <Text style={[styles.collapseCount, { fontFamily: font.semibold }]}>
            {orders.length}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Order Cards List ── */}
      {!collapsed && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ maxHeight }}
          contentContainerStyle={styles.listContent}
          nestedScrollEnabled
        >
          {sortedOrders.map((order, idx) => (
            <OrderCard
              key={order.id}
              order={order}
              rtl={rtl}
              font={font}
              t={t}
              isLast={idx === orders.length - 1}
              hasActiveDelivery={hasActiveDelivery}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ── Order Card ─────────────────────────────────────────────────────────────────

function OrderCard({
  order,
  rtl,
  font,
  t,
  isLast,
  hasActiveDelivery,
}: {
  order: AcceptedOrderItem;
  rtl: boolean;
  font: ReturnType<typeof useAppFont>;
  t: ReturnType<typeof useTranslation>["t"];
  isLast: boolean;
  hasActiveDelivery: boolean;
}) {
  const dir = rtl ? "row-reverse" : "row";
  const textAlign = rtl ? "right" : "left";

  return (
    <View style={[styles.card, !isLast && styles.cardGap]}>
      {/* ── Row 1: Avatar + Restaurant Name + Price ── */}
      <View style={[styles.cardTopRow, { flexDirection: dir }]}>
        {/* Avatar */}
        <View style={styles.avatarRing}>
          {order.restaurantAvatar ? (
            <Image
              source={{ uri: order.restaurantAvatar }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]} />
          )}
        </View>

        {/* Name – flex to fill remaining horizontal space */}
        <Text
          style={[
            styles.restaurantName,
            {
              fontFamily: font.bold,
              textAlign,
              marginLeft: rtl ? 0 : scale(10),
              marginRight: rtl ? scale(10) : 0,
            },
          ]}
          numberOfLines={1}
        >
          {order.restaurantName}
        </Text>

        {/* Price */}
        <Text style={[styles.price, { fontFamily: font.bold }]}>
          {order.price}
        </Text>
      </View>

      {/* ── Row 2: Route (pickup → [connector] → dropoff) ── */}
      <View
        style={[
          styles.routeRow,
          {
            flexDirection: dir,
            marginTop: verticalScale(10),
            justifyContent: rtl ? "flex-end" : "flex-start",
          },
        ]}
      >
        {/* Pickup point */}
        <View style={[styles.routePoint, { flexDirection: dir }]}>
          <View style={styles.pickupDot} />
          <Text
            style={[
              styles.routeText,
              {
                fontFamily: font.regular,
                marginLeft: rtl ? 0 : scale(5),
                marginRight: rtl ? scale(5) : 0,
              },
            ]}
            numberOfLines={1}
          >
            {t("orders.pickup")}: {order.pickupLocation}
          </Text>
        </View>

        {/* Connector + Dropoff – only when dropoffLocation is provided */}
        {order.actionType === "deliver" && order.dropoffLocation ? (
          <>
            {/* Connector */}
            <View
              style={[
                styles.routeConnector,
                {
                  marginLeft: rtl ? 0 : scale(6),
                  marginRight: rtl ? scale(6) : 0,
                },
              ]}
            />

            {/* Dropoff */}
            <View style={[styles.routePoint, { flexDirection: dir }]}>
              <View style={styles.dropoffDotOuter}>
                <View style={styles.dropoffDotInner} />
              </View>
              <Text
                style={[
                  styles.routeText,
                  {
                    fontFamily: font.regular,
                    marginLeft: rtl ? 0 : scale(5),
                    marginRight: rtl ? scale(5) : 0,
                  },
                ]}
                numberOfLines={1}
              >
                {t("orders.dropoff")}: {order.dropoffLocation}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      {/* ── Row 3: Cancel + Primary Action ── */}
      <View
        style={[
          styles.actionRow,
          {
            flexDirection: dir,
            marginTop: verticalScale(16),
          },
        ]}
      >
        {/* Cancel – plain text, smaller weight */}
        <TouchableOpacity
          onPress={order.onCancel}
          activeOpacity={0.65}
          style={styles.cancelBtn}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.cancelText, { fontFamily: font.medium }]}>
            {t("common.cancel")}
          </Text>
        </TouchableOpacity>

        {/* Primary Action Button */}
        {order.actionType === "deliver" ? (
          <TouchableOpacity
            onPress={order.onDeliver}
            activeOpacity={0.85}
            style={[styles.actionBtn, styles.deliverBtn]}
          >
            <Text style={[styles.actionBtnText, { fontFamily: font.semibold }]}>
              {t("orders.delivered")}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={hasActiveDelivery ? undefined : order.onGoToRestaurant}
            disabled={hasActiveDelivery}
            activeOpacity={hasActiveDelivery ? 1 : 0.85}
            style={[
              styles.actionBtn,
              styles.goToRestaurantBtn,
              hasActiveDelivery && styles.disabledBtn,
            ]}
          >
            <Text style={[styles.actionBtnText, { fontFamily: font.semibold }]}>
              {t("orders.goToRestaurant")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Container ──────────────────────────────────────────────────────────────
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 100,

    backgroundColor: Colors.background ?? "#F0EEF8",
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    overflow: "hidden",

    paddingHorizontal: spacing.md,
    paddingTop: verticalScale(18),
    paddingBottom: verticalScale(14),
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(16),
    paddingHorizontal: scale(2),
  },
  headerLeft: {
    alignItems: "center",
    gap: scale(10),
  },
  headerTitle: {
    fontSize: fontSize.xl,
    color: "#1A1A2E",
  },

  // ── Collapse Pill ───────────────────────────────────────────────────────────
  collapsePill: {
    alignItems: "center",
    gap: scale(5),
    backgroundColor: "#E8E7EF",
    borderRadius: scale(22),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
  },
  collapseCount: {
    fontSize: FontSize.md ?? 16,
    color: "#1A1A2E",
  },

  // ── List ───────────────────────────────────────────────────────────────────
  listContent: {
    paddingBottom: spacing.sm,
  },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(22),
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(16),
    marginVertical: verticalScale(10),
    marginHorizontal: verticalScale(10),
    paddingBottom: verticalScale(18),
    shadowColor: "#1A1A2E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardGap: {
    marginBottom: verticalScale(12),
  },

  // ── Card Top Row ───────────────────────────────────────────────────────────
  cardTopRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Avatar
  avatarRing: {
    borderRadius: scale(25),
    borderWidth: 1.5,
    borderColor: Colors.primary ?? "#7B3FEE",
    overflow: "hidden",
  },
  avatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
  },
  avatarFallback: {
    backgroundColor: "#E8E7EF",
  },

  // Restaurant name – flex so it fills space between avatar and price
  restaurantName: {
    flex: 1,
    fontSize: FontSize.md ?? 16,
    color: "#1A1A2E",
  },

  // Price
  price: {
    fontSize: scale(17),
    color: "#1A1A2E",
    flexShrink: 0,
  },

  // ── Route Row ──────────────────────────────────────────────────────────────
  routeRow: {
    alignItems: "center",
  },
  routePoint: {
    alignItems: "center",
    flexShrink: 1,
    marginHorizontal: 3,
  },

  // Pickup dot – solid gray circle
  pickupDot: {
    width: scale(15),
    height: scale(15),
    borderRadius: scale(8),
    borderWidth: scale(2),
    borderColor: Colors.inputBg,
    backgroundColor: "#9A9AAF",
  },

  // Dropoff dot – green with light outer ring
  dropoffDotOuter: {
    width: scale(15),
    height: scale(15),
    borderRadius: scale(8),
    backgroundColor: "#D4F8E2",
    alignItems: "center",
    justifyContent: "center",
  },
  dropoffDotInner: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: "#22C55E",
  },

  // Route text
  routeText: {
    fontSize: scale(13),
    color: "#1A1A2E",
    flexShrink: 1,
  },

  // Horizontal connector bar between pickup and dropoff
  routeConnector: {
    height: scale(3),
    width: scale(38),
    backgroundColor: "#D1D0DC",
    borderRadius: scale(2),
    flexShrink: 0,
  },

  // ── Action Row ─────────────────────────────────────────────────────────────
  actionRow: {
    alignItems: "center",
    gap: scale(8),
  },

  // Cancel – subtle text-only button
  cancelBtn: {
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(12),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cancelText: {
    fontSize: FontSize.md ?? 16,
    color: "#9A9AAF",
  },

  // Primary action – flex to fill remaining space
  actionBtn: {
    flex: 1,
    borderRadius: scale(40),
    paddingVertical: verticalScale(15),
    alignItems: "center",
    justifyContent: "center",
  },
  deliverBtn: {
    backgroundColor: "#22C55E",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  goToRestaurantBtn: {
    backgroundColor: "#1A1A2E",
    shadowColor: "#1A1A2E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    fontSize: FontSize.md ?? 16,
    color: "#FFFFFF",
  },
  disabledBtn: {
    opacity: 0.4,
  },
});
