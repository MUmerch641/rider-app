/**
 * AcceptedOrdersSheet
 * ────────────────────────────────────────────────────────────────────
 * Bottom sheet pinned to the map screen listing the rider's in-progress
 * deliveries, rendered straight from server-truth `OrderAssignment`s
 * (GET /driver/orders) — no local closure state.
 *
 * Each card offers exactly two interactions:
 *  - tapping the CARD opens the live navigation screen
 *    (/orders/delivery_route) which derives pickup/dropoff routing from
 *    the order's live status;
 *  - the ADVANCE button moves the order one step along the lifecycle
 *    chain (utils/orderLifecycle.ts) with a per-order busy spinner.
 *
 * There is intentionally NO local cancel (cancellation goes through the
 * cancel-request flow on the route screen) and NO cross-card disabling —
 * a rider can hold two orders and both cards stay fully functional.
 * ────────────────────────────────────────────────────────────────────
 */

import type { OrderAssignment } from "@/api";
import { Colors, FontSize } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { formatCurrency } from "@/utils/format";
import { localizeName, type LangKey } from "@/utils/localize";
import { nextStep } from "@/utils/orderLifecycle";
import { fontSize, scale, spacing, verticalScale } from "@/utils/responsive";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { SafeImage } from "@/components/SafeImage";
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

interface AcceptedOrdersSheetProps {
  /** In-progress assignments (already filtered to ACTIVE_STATUSES). */
  orders: OrderAssignment[];
  /** orderIds with a status-advance request in flight → per-card spinner. */
  advancingIds?: Record<string, boolean>;
  /** Tap anywhere on a card → open live navigation for that order. */
  onOrderPress?: (assignment: OrderAssignment) => void;
  /** Tap the advance CTA → move the order one lifecycle step forward. */
  onAdvance?: (assignment: OrderAssignment) => void;
  /** Override container styles (background, border-radius, padding…) */
  style?: ViewStyle;
  /** Max scrollable height of the order list. Default: 460 */
  maxHeight?: number;
  /** Start collapsed? Default: true */
  defaultCollapsed?: boolean;
  /**
   * Monotonic counter — every time it changes the sheet force-expands. The map
   * screen bumps it on focus so returning from the delivery-route screen always
   * re-reveals the order list instead of leaving the rider on a bare header.
   */
  expandSignal?: number;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function AcceptedOrdersSheet({
  orders,
  advancingIds,
  onOrderPress,
  onAdvance,
  style,
  maxHeight = verticalScale(460),
  defaultCollapsed = true,
  expandSignal,
}: AcceptedOrdersSheetProps) {
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const langKey: LangKey = (i18n.language as LangKey) || "en";
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  // Force the list open whenever the parent bumps expandSignal (screen focus).
  // The rider can still collapse it manually afterwards; the next focus reopens.
  useEffect(() => {
    if (expandSignal === undefined) return;
    setCollapsed(false);
  }, [expandSignal]);

  return (
    <View style={[styles.container, style]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        {/* Leading: icon + title */}
        <View style={styles.headerLeft}>
          <SvgXml xml={PACKAGE_ICON_SVG} width={scale(22)} height={scale(22)} />
          <Text style={[styles.headerTitle, { fontFamily: font.bold }]}>
            {t("orders.acceptedOrders")}
          </Text>
        </View>

        {/* Trailing: collapse pill with chevron + count */}
        <TouchableOpacity
          style={styles.collapsePill}
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
          {orders.map((assignment, idx) => (
            <OrderCard
              key={assignment.orderId}
              assignment={assignment}
              langKey={langKey}
              font={font}
              t={t}
              isLast={idx === orders.length - 1}
              advancing={!!advancingIds?.[assignment.orderId]}
              onPress={onOrderPress}
              onAdvance={onAdvance}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ── Order Card ─────────────────────────────────────────────────────────────────

function OrderCard({
  assignment,
  langKey,
  font,
  t,
  isLast,
  advancing,
  onPress,
  onAdvance,
}: {
  assignment: OrderAssignment;
  langKey: LangKey;
  font: ReturnType<typeof useAppFont>;
  t: ReturnType<typeof useTranslation>["t"];
  isLast: boolean;
  advancing: boolean;
  onPress?: (assignment: OrderAssignment) => void;
  onAdvance?: (assignment: OrderAssignment) => void;
}) {
  const order = assignment.order;
  const storeName = localizeName(order?.store?.name, langKey);
  const storeAvatar = order?.store?.avatar ?? undefined;
  const price = formatCurrency(order?.total, order?.currency ?? "IQD");
  const pickup = order?.store?.address ?? "";
  const dropoff = (() => {
    const da = order?.deliveryAddress;
    if (!da) return "";
    return ([da.building, da.street].filter(Boolean) as string[]).join(", ");
  })();

  // Single source of truth for the advance CTA (accepted → picked_up → …).
  const step = nextStep(assignment.status);
  const statusLabel = t(`orders.status.${assignment.status}`, {
    defaultValue: assignment.status,
  });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress?.(assignment)}
      style={[styles.card, !isLast && styles.cardGap]}
    >
      {/* ── Row 1: Avatar + Restaurant Name + Price ── */}
      <View style={styles.cardTopRow}>
        {/* Avatar */}
        <View style={styles.avatarRing}>
          {storeAvatar ? (
            <SafeImage
              uri={storeAvatar}
              variant="store"
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]} />
          )}
        </View>

        {/* Name + order number – flex to fill remaining horizontal space */}
        <View
          style={{
            flex: 1,
            marginLeft: scale(10),
            alignItems: "flex-start",
          }}
        >
          <Text
            style={[styles.restaurantName, { fontFamily: font.bold }]}
            numberOfLines={1}
          >
            {storeName}
          </Text>
          {order?.orderNumber ? (
            <Text
              style={[styles.orderNumber, { fontFamily: font.regular }]}
              numberOfLines={1}
            >
              #{order.orderNumber}
            </Text>
          ) : null}
        </View>

        {/* Price */}
        <Text style={[styles.price, { fontFamily: font.bold }]}>{price}</Text>
      </View>

      {/* ── Row 2: Route (pickup → [connector] → dropoff) ── */}
      <View style={[styles.routeRow, { marginTop: verticalScale(10) }]}>
        {/* Pickup point */}
        <View style={styles.routePoint}>
          <View style={styles.pickupDot} />
          <Text
            style={[styles.routeText, { fontFamily: font.regular }]}
            numberOfLines={1}
          >
            {t("orders.pickup")}: {pickup}
          </Text>
        </View>

        {/* Connector + Dropoff */}
        {dropoff ? (
          <>
            {/* Connector */}
            <View style={styles.routeConnector} />

            {/* Dropoff */}
            <View style={styles.routePoint}>
              <View style={styles.dropoffDotOuter}>
                <View style={styles.dropoffDotInner} />
              </View>
              <Text
                style={[styles.routeText, { fontFamily: font.regular }]}
                numberOfLines={1}
              >
                {t("orders.dropoff")}: {dropoff}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      {/* ── Row 3: Status chip + Advance CTA ── */}
      <View style={[styles.actionRow, { marginTop: verticalScale(16) }]}>
        {/* Status chip — translated live status */}
        <View style={styles.statusChip}>
          <Text style={[styles.statusChipText, { fontFamily: font.medium }]}>
            {statusLabel}
          </Text>
        </View>

        {/* Advance button — single tap moves the order one step forward.
            Hidden only when the chain has no next step for this status. */}
        {step ? (
          <TouchableOpacity
            onPress={() => onAdvance?.(assignment)}
            disabled={advancing}
            activeOpacity={0.85}
            style={[styles.actionBtn, advancing && styles.actionBtnBusy]}
          >
            {advancing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                style={[styles.actionBtnText, { fontFamily: font.semibold }]}
              >
                {t(step.labelKey, { defaultValue: step.defaultLabel })}
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(16),
    paddingHorizontal: scale(2),
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  headerTitle: {
    fontSize: fontSize.xl,
    color: "#1A1A2E",
  },

  // ── Collapse Pill ───────────────────────────────────────────────────────────
  collapsePill: {
    flexDirection: "row",
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
    marginHorizontal: scale(10),
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
    flexDirection: "row",
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

  // Restaurant name + order number
  restaurantName: {
    fontSize: FontSize.md ?? 16,
    color: "#1A1A2E",
  },
  orderNumber: {
    fontSize: scale(12),
    color: "#9A9AAF",
    marginTop: scale(2),
  },

  // Price
  price: {
    fontSize: scale(17),
    color: "#1A1A2E",
    flexShrink: 0,
  },

  // ── Route Row ──────────────────────────────────────────────────────────────
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  routePoint: {
    flexDirection: "row",
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
    marginLeft: scale(5),
  },

  // Horizontal connector bar between pickup and dropoff
  routeConnector: {
    marginLeft: scale(6),
    height: scale(3),
    width: scale(38),
    backgroundColor: "#D1D0DC",
    borderRadius: scale(2),
    flexShrink: 0,
  },

  // ── Action Row ─────────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },

  // Status chip — live order status
  statusChip: {
    backgroundColor: "#F3EFFC",
    borderRadius: scale(20),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(14),
    flexShrink: 0,
  },
  statusChipText: {
    fontSize: scale(13),
    color: "#6B21E8",
  },

  // Primary action – flex to fill remaining space
  actionBtn: {
    flex: 1,
    borderRadius: scale(40),
    paddingVertical: verticalScale(15),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1A2E",
    shadowColor: "#1A1A2E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnBusy: {
    opacity: 0.7,
  },
  actionBtnText: {
    fontSize: FontSize.md ?? 16,
    color: "#FFFFFF",
  },
});
