/**
 * AcceptedOrdersSheet
 * ────────────────────────────────────────────────────────────────────
 * Bottom sheet pinned to the map screen listing the rider's in-progress
 * deliveries, rendered straight from server-truth `OrderAssignment`s
 * (GET /driver/orders) — no local closure state.
 *
 * Each card offers exactly two interactions:
 *  - tapping the CARD opens the live navigation screen
 *    inline on the map, advancing the order one step per tap.
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
import { ordersApi } from "@/api";
import { Colors, FontSize } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { formatCurrency } from "@/utils/format";
import { localizeName, type LangKey } from "@/utils/localize";
import { nextStep } from "@/utils/orderLifecycle";
import {
  assignmentToSummaryPayload,
  itemDisplayName,
} from "@/utils/assignmentSummary";
import { fontSize, scale, spacing, verticalScale } from "@/utils/responsive";
import { openWhatsAppChat } from "@/utils/whatsapp";
import { cacheStorePhone } from "@/utils/storeContactCache";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  I18nManager,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { SafeImage } from "@/components/SafeImage";
import { Ionicons } from "@expo/vector-icons";
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
  /**
   * Newly-offered assignments not yet accepted (status === "assigned").
   * Surfaced as a second "New Orders Nearby" section so removing the Orders
   * tab loses nothing (R4). Each renders an Accept / Decline pair.
   */
  nearbyOrders?: OrderAssignment[];
  /** orderIds with an accept/decline request in flight → per-card disable. */
  actingIds?: Record<string, boolean>;
  /** Accept a nearby offer (reuses ordersApi.accept). */
  onAcceptNearby?: (orderId: string) => void;
  /** Decline a nearby offer (reuses ordersApi.reject). */
  onDeclineNearby?: (orderId: string) => void;
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
   * screen bumps it on focus so the order list is reliably re-revealed instead
   * of leaving the rider on a bare header.
   */
  expandSignal?: number;
  /**
   * Controlled collapse. When provided, the open/closed state is owned by the
   * parent — the map dock uses this to run the offer⇄accepted accordion so the
   * two panels never overlap. When omitted, the sheet manages collapse itself.
   */
  collapsed?: boolean;
  /** Fired with the NEXT collapsed value when the chevron is tapped. */
  onToggle?: (next: boolean) => void;
  /** orderId of the focused order — its card is highlighted as active. */
  activeOrderId?: string | null;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function AcceptedOrdersSheet({
  orders,
  nearbyOrders = [],
  actingIds,
  onAcceptNearby,
  onDeclineNearby,
  advancingIds,
  onOrderPress,
  onAdvance,
  style,
  maxHeight = verticalScale(460),
  defaultCollapsed = true,
  expandSignal,
  collapsed: collapsedProp,
  onToggle,
  activeOrderId,
}: AcceptedOrdersSheetProps) {
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const langKey: LangKey = (i18n.language as LangKey) || "en";
  const isControlled = collapsedProp !== undefined;
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const collapsed = isControlled ? collapsedProp : internalCollapsed;
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const handleToggle = () => {
    const next = !collapsed;
    if (isControlled) onToggle?.(next);
    else setInternalCollapsed(next);
  };

  // Force the list open whenever the parent bumps expandSignal (screen focus).
  // Skipped when controlled — the parent owns collapse and bumping it here would
  // fight the offer⇄accepted accordion. The rider can still collapse manually.
  useEffect(() => {
    if (isControlled || expandSignal === undefined) return;
    setInternalCollapsed(false);
  }, [expandSignal, isControlled]);

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
          onPress={handleToggle}
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
              active={
                orders.length > 1 && assignment.orderId === activeOrderId
              }
              onPress={onOrderPress}
              onAdvance={onAdvance}
              expanded={expandedOrderId === assignment.orderId}
              onToggleExpand={() =>
                setExpandedOrderId((cur) =>
                  cur === assignment.orderId ? null : assignment.orderId,
                )
              }
            />
          ))}

          {/* ── New Orders Nearby (R4) ── offered-but-unaccepted assignments,
              relocated here from the removed Orders tab. */}
          {nearbyOrders.length > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text
                  style={[styles.sectionHeaderText, { fontFamily: font.bold }]}
                >
                  {t("orders.newOrdersNearby")}
                </Text>
                <View style={styles.sectionBadge}>
                  <Text
                    style={[styles.sectionBadgeText, { fontFamily: font.bold }]}
                  >
                    {nearbyOrders.length}
                  </Text>
                </View>
              </View>

              {nearbyOrders.map((assignment, idx) => (
                <NearbyOrderCard
                  key={assignment.orderId}
                  assignment={assignment}
                  langKey={langKey}
                  font={font}
                  t={t}
                  isLast={idx === nearbyOrders.length - 1}
                  acting={!!actingIds?.[assignment.orderId]}
                  onAccept={onAcceptNearby}
                  onDecline={onDeclineNearby}
                />
              ))}
            </>
          )}
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
  active,
  onPress,
  onAdvance,
  expanded,
  onToggleExpand,
}: {
  assignment: OrderAssignment;
  langKey: LangKey;
  font: ReturnType<typeof useAppFont>;
  t: ReturnType<typeof useTranslation>["t"];
  isLast: boolean;
  advancing: boolean;
  active?: boolean;
  onPress?: (assignment: OrderAssignment) => void;
  onAdvance?: (assignment: OrderAssignment) => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const order = assignment.order;
  const [detailAssignment, setDetailAssignment] = useState(assignment);

  useEffect(() => {
    setDetailAssignment(assignment);
  }, [assignment]);

  useEffect(() => {
    if (!expanded) return;
    const snapshot = assignmentToSummaryPayload(assignment, langKey);
    const needsStorePhone = !snapshot.store?.phone?.trim();
    const needsCustomerPhone = !snapshot.customer?.phone?.trim();
    if (!needsStorePhone && !needsCustomerPhone) return;

    let cancelled = false;
    void ordersApi
      .getById(assignment.orderId)
      .then((full) => {
        if (cancelled) return;
        cacheStorePhone(full.orderId, full.order?.store?.phone);
        setDetailAssignment(full);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [expanded, assignment, langKey]);

  const summary = assignmentToSummaryPayload(detailAssignment, langKey);
  const summaryItems = (summary.items ?? []).filter(
    (it) => itemDisplayName(it.name, langKey).length > 0,
  );
  const storeName = localizeName(order?.store?.name, langKey);
  const storeAvatar = order?.store?.avatar ?? undefined;
  const price = formatCurrency(order?.total, order?.currency ?? "IQD");
  const currency = order?.currency ?? "IQD";
  const customerName =
    summary.customer?.name?.trim() || t("onmap.customer", "Customer");
  const storePhone = summary.store?.phone?.trim();
  const customerPhone = summary.customer?.phone?.trim();
  const pickup = order?.store?.address ?? "";
  const dropoff = (() => {
    const da = order?.deliveryAddress;
    if (!da) return "";
    const parts = [da.building, da.street].filter(Boolean) as string[];
    // #17: show the delivery CITY (not the governorate baked into `street`).
    const cityName = localizeName(order?.city?.name, langKey);
    if (cityName && !parts.some((p) => p.includes(cityName)))
      parts.push(cityName);
    return parts.join(", ");
  })();

  // Single source of truth for the advance CTA (accepted → picked_up → …).
  const step = nextStep(assignment.status);
  const statusLabel = t(`orders.status.${assignment.status}`, {
    defaultValue: assignment.status,
  });

  const whatsappMessage = order?.orderNumber
    ? t("onmap.whatsappOrderMessage", {
        orderNumber: order.orderNumber,
        defaultValue: "Hi, this is your OnWay driver — about order #{{orderNumber}}.",
      })
    : undefined;

  const dial = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s+/g, "")}`).catch(() => undefined);
  };

  const whatsapp = (phone: string) => {
    void openWhatsAppChat(phone, whatsappMessage);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      // #16: the whole card is the expand affordance (not just the status chip),
      // while still selecting/centering the order on the map as before.
      onPress={() => {
        onToggleExpand?.();
        onPress?.(assignment);
      }}
      style={[styles.card, !isLast && styles.cardGap, active && styles.cardActive]}
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

          {/* #16: merchant call / WhatsApp beside the store name — always
              visible, no need to expand first. Nested Touchables capture the
              tap so they don't also toggle the card. */}
          {storePhone ? (
            <View style={[styles.headerContactRow, { flexDirection: "row" }]}>
              <TouchableOpacity
                style={styles.headerContactBtn}
                activeOpacity={0.82}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={() => dial(storePhone)}
              >
                <Ionicons name="call" size={scale(13)} color="#1A1A2E" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerContactBtn, styles.headerContactBtnWa]}
                activeOpacity={0.82}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={() => whatsapp(storePhone)}
              >
                <Ionicons name="logo-whatsapp" size={scale(13)} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
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

      {/* ── Row 2b: Inline order details (toggle on status chip) ── */}
      {expanded ? (
        <View style={styles.inlineDetails}>
          {summaryItems.length > 0 ? (
            summaryItems.map((it, idx) => {
              const label = itemDisplayName(it.name, langKey);
              const lineTotal =
                it.price && it.price > 0
                  ? formatCurrency(
                      it.price * (it.quantity ?? 1),
                      currency,
                    )
                  : null;
              return (
                <View
                  key={`${label}-${idx}`}
                  style={styles.inlineDetailRow}
                >
                  {it.image ? (
                    <SafeImage
                      uri={it.image}
                      variant="food"
                      style={styles.inlineItemThumb}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.inlineItemThumb, styles.avatarFallback]} />
                  )}
                  <View style={styles.inlineDetailBody}>
                    <Text
                      style={[styles.inlineDetailText, { fontFamily: font.regular }]}
                      numberOfLines={2}
                    >
                      {it.quantity ?? 1}× {label}
                    </Text>
                    {it.variants ? (
                      <Text
                        style={[styles.inlineVariantText, { fontFamily: font.regular }]}
                        numberOfLines={2}
                      >
                        {it.variants}
                      </Text>
                    ) : null}
                    {it.notes ? (
                      <Text
                        style={[styles.inlineNotesText, { fontFamily: font.regular }]}
                        numberOfLines={2}
                      >
                        {it.notes}
                      </Text>
                    ) : null}
                  </View>
                  {lineTotal ? (
                    <Text
                      style={[styles.inlineItemPrice, { fontFamily: font.medium }]}
                    >
                      {lineTotal}
                    </Text>
                  ) : null}
                </View>
              );
            })
          ) : (
            <Text style={[styles.inlineDetailText, { fontFamily: font.regular }]}>
              {t("activeOrders.noItems", "No item details")}
            </Text>
          )}
          {summary.customer?.name ? (
            <Text style={[styles.inlineMeta, { fontFamily: font.medium }]}>
              {t("onmap.customer", "Customer")}: {summary.customer.name}
            </Text>
          ) : null}

          {/* #16: store call / WhatsApp moved up beside the store name (header). */}

          <View style={styles.contactSection}>
            <Text style={[styles.contactSectionLabel, { fontFamily: font.semibold }]}>
              {t("onmap.customer", "Customer")} · {customerName}
            </Text>
            {customerPhone ? (
              <View style={styles.contactRow}>
                <TouchableOpacity
                  style={styles.contactChip}
                  activeOpacity={0.82}
                  onPress={() => dial(customerPhone)}
                >
                  <Ionicons name="call-outline" size={scale(14)} color="#1A1A2E" />
                  <Text style={[styles.contactChipText, { fontFamily: font.medium }]}>
                    {t("onmap.callCustomer", "Call")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contactChip, styles.contactChipWhatsApp]}
                  activeOpacity={0.82}
                  onPress={() => whatsapp(customerPhone)}
                >
                  <Ionicons name="logo-whatsapp" size={scale(14)} color="#FFFFFF" />
                  <Text
                    style={[
                      styles.contactChipText,
                      styles.contactChipTextLight,
                      { fontFamily: font.medium },
                    ]}
                  >
                    {t("onmap.whatsappCustomer", "WhatsApp")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[styles.contactUnavailable, { fontFamily: font.regular }]}>
                {t("onmap.customerPhoneUnavailable", "Customer phone unavailable")}
              </Text>
            )}
          </View>
        </View>
      ) : null}

      {/* ── Row 3: Status chip (toggle) + Advance CTA ── */}
      <View style={[styles.actionRow, { marginTop: verticalScale(16) }]}>
        <TouchableOpacity
          onPress={onToggleExpand}
          activeOpacity={0.82}
          style={styles.statusChip}
          accessibilityRole="button"
          accessibilityState={{ expanded: !!expanded }}
        >
          <Text style={[styles.statusChipText, { fontFamily: font.medium }]}>
            {statusLabel}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={scale(14)}
            color={Colors.primary}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>

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

// ── Nearby Order Card ────────────────────────────────────────────────────────
// Mirrors the old Orders-tab "New Orders Nearby" card: store + price, pickup →
// dropoff route, and an Accept / Decline pair (reusing ordersApi via the
// parent's handlers).
function NearbyOrderCard({
  assignment,
  langKey,
  font,
  t,
  isLast,
  acting,
  onAccept,
  onDecline,
}: {
  assignment: OrderAssignment;
  langKey: LangKey;
  font: ReturnType<typeof useAppFont>;
  t: ReturnType<typeof useTranslation>["t"];
  isLast: boolean;
  acting: boolean;
  onAccept?: (orderId: string) => void;
  onDecline?: (orderId: string) => void;
}) {
  const order = assignment.order;
  const storeName = localizeName(order?.store?.name, langKey);
  const storeAvatar = order?.store?.avatar ?? undefined;
  const price = formatCurrency(order?.total, order?.currency ?? "IQD");
  const pickup = order?.store?.address ?? "";
  const dropoff = (() => {
    const da = order?.deliveryAddress;
    if (!da) return "";
    const parts = [da.building, da.street].filter(Boolean) as string[];
    // #17: show the delivery CITY (not the governorate baked into `street`).
    const cityName = localizeName(order?.city?.name, langKey);
    if (cityName && !parts.some((p) => p.includes(cityName)))
      parts.push(cityName);
    return parts.join(", ");
  })();

  return (
    <View style={[styles.card, !isLast && styles.cardGap]}>
      {/* ── Row 1: Avatar + Restaurant Name + Price ── */}
      <View style={styles.cardTopRow}>
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

        <Text style={[styles.price, { fontFamily: font.bold }]}>{price}</Text>
      </View>

      {/* ── Row 2: Route (pickup → [connector] → dropoff) ── */}
      <View style={[styles.routeRow, { marginTop: verticalScale(10) }]}>
        <View style={styles.routePoint}>
          <View style={styles.pickupDot} />
          <Text
            style={[styles.routeText, { fontFamily: font.regular }]}
            numberOfLines={1}
          >
            {t("orders.pickup")}: {pickup}
          </Text>
        </View>

        {dropoff ? (
          <>
            <View style={styles.routeConnector} />
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

      {/* ── Row 3: Decline / Accept ── */}
      <View style={[styles.actionRow, { marginTop: verticalScale(16) }]}>
        <TouchableOpacity
          style={styles.declineBtn}
          activeOpacity={0.75}
          disabled={acting}
          onPress={() => onDecline?.(assignment.orderId)}
        >
          <Text
            style={[styles.declineBtnText, { fontFamily: font.medium }]}
          >
            {t("orders.decline")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.acceptBtn, acting && styles.actionBtnBusy]}
          activeOpacity={0.85}
          disabled={acting}
          onPress={() => onAccept?.(assignment.orderId)}
        >
          {acting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text
              style={[styles.acceptBtnText, { fontFamily: font.semibold }]}
            >
              {t("orders.accept")}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Container ──────────────────────────────────────────────────────────────
  container: {
    // Flow child of the map dock (parent absolute-positions the dock); the dock
    // stacks this below the offer card so the two can never overlap.
    width: "100%",
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
  // Focused order — its route/ETA/prep ring are the ones shown on the map.
  cardActive: {
    borderWidth: 1.5,
    borderColor: "#7900F3",
    shadowOpacity: 0.16,
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
  // #16: compact merchant call / WhatsApp beside the store name.
  headerContactRow: {
    marginTop: scale(6),
    gap: scale(8),
    alignItems: "center",
  },
  headerContactBtn: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: "#EFEFF4",
    alignItems: "center",
    justifyContent: "center",
  },
  headerContactBtnWa: {
    backgroundColor: "#25D366",
  },

  // Price
  price: {
    fontSize: scale(17),
    color: "#1A1A2E",
    flexShrink: 0,
  },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: verticalScale(12),
    paddingVertical: verticalScale(11),
    paddingHorizontal: scale(14),
    borderRadius: scale(12),
    backgroundColor: "#F3EDFF",
    borderWidth: 1.5,
    borderColor: "#D4C0FF",
  },
  detailsBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    flex: 1,
    minWidth: 0,
  },
  detailsIconWrap: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(8),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E4D6FF",
  },
  detailsBtnText: {
    fontSize: scale(14),
    color: Colors.primary,
    flexShrink: 1,
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

  // Status chip — live order status (tap to expand details inline)
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
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
  inlineDetails: {
    marginTop: verticalScale(12),
    padding: scale(12),
    borderRadius: scale(14),
    backgroundColor: "#F8F7FC",
    gap: verticalScale(8),
  },
  inlineDetailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scale(8),
  },
  inlineDetailBody: {
    flex: 1,
    minWidth: 0,
    gap: verticalScale(2),
  },
  inlineItemThumb: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(8),
  },
  inlineDetailText: {
    fontSize: scale(13),
    color: "#1A1A2E",
  },
  inlineVariantText: {
    fontSize: scale(11),
    color: "#6B7280",
  },
  inlineNotesText: {
    fontSize: scale(11),
    color: "#9A9AAF",
    fontStyle: "italic",
  },
  inlineItemPrice: {
    fontSize: scale(12),
    color: "#1A1A2E",
    flexShrink: 0,
  },
  inlineMeta: {
    fontSize: scale(12),
    color: "#6B7280",
    marginTop: verticalScale(4),
  },
  contactSection: {
    marginTop: verticalScale(12),
    gap: verticalScale(8),
  },
  contactSectionLabel: {
    fontSize: scale(12),
    color: "#4B5563",
  },
  contactUnavailable: {
    fontSize: scale(12),
    color: "#9A9AAF",
    fontStyle: "italic",
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
    marginTop: verticalScale(10),
  },
  contactChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4D6FF",
  },
  contactChipWhatsApp: {
    backgroundColor: "#25D366",
    borderColor: "#25D366",
  },
  contactChipText: {
    fontSize: scale(12),
    color: "#1A1A2E",
  },
  contactChipTextLight: {
    color: "#FFFFFF",
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

  // ── New Orders Nearby section (R4) ──────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    marginTop: verticalScale(8),
    marginBottom: verticalScale(2),
    marginHorizontal: scale(10),
  },
  sectionHeaderText: {
    fontSize: fontSize.lg,
    color: "#1A1A2E",
  },
  sectionBadge: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: "#E8E7EF",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionBadgeText: {
    fontSize: FontSize.xs,
    color: "#1A1A2E",
  },

  // Decline / Accept pair for nearby offers
  declineBtn: {
    flex: 1,
    borderRadius: scale(40),
    paddingVertical: verticalScale(15),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  declineBtnText: {
    fontSize: FontSize.md ?? 16,
    color: Colors.textSecondary,
  },
  acceptBtn: {
    flex: 1,
    borderRadius: scale(40),
    paddingVertical: verticalScale(15),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22C55E",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtnText: {
    fontSize: FontSize.md ?? 16,
    color: "#FFFFFF",
  },
});
