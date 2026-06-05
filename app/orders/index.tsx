import {
    ordersApi,
    walletApi,
    type ApiError,
    type OrderAssignment,
} from "@/api";
import { OpenStatusToggle } from "@/components/ui";
import { isRTL } from "@/constants/i18n";
import { Colors, FontSize, Radius, Shadow } from "@/constants/theme";
import { useAuth, useSocket } from "@/context";
import { useAppFont } from "@/hooks/useAppFont";
import {
    formatCurrency,
    formatDurationMinutes,
    formatNumber,
} from "@/utils/format";
import { localizeName, type LangKey } from "@/utils/localize";
import { avatarSource, storeSource } from "@/utils/placeholders";
import { fontSize, scale, spacing, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ACTIVE_STATUSES = new Set([
  "accepted",
  "arrived_store",
  "picked_up",
  "on_the_way",
  "arrived",
]);

export default function OrdersScreen() {
  const font = useAppFont();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const rtl = isRTL(i18n.language);
  const dir = rtl ? "row-reverse" : "row";
  const langKey: LangKey = (i18n.language as LangKey) || "en";

  const { driver, updateStatus } = useAuth();
  const { newOrder, cancelledOrder } = useSocket();

  const [assignments, setAssignments] = useState<OrderAssignment[]>([]);
  const [todayEarnings, setTodayEarnings] = useState<string>("0");
  const [todayCount, setTodayCount] = useState<number>(0);
  const [statusBusy, setStatusBusy] = useState(false);
  const [acting, setActing] = useState<Record<string, boolean>>({});

  const refreshAssignments = useCallback(async () => {
    try {
      const list = await ordersApi.list();
      setAssignments(list);
    } catch (err) {
      console.warn("Fetch orders failed:", (err as ApiError)?.message);
    }
  }, []);

  const refreshSummary = useCallback(async () => {
    if (!driver?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      const s = await walletApi.summary({ startDate: today, endDate: today });
      setTodayEarnings(formatNumber(s?.summary?.totalEarnings));
      setTodayCount(s?.summary?.deliveryCount ?? 0);
    } catch {
      // ignore — keep last-known values
    }
  }, [driver?.id]);

  // Refresh on every focus (mount + return-to-tab) so post-delivery state surfaces.
  // Also poll every 15s while focused as a safety net for missed socket events.
  useFocusEffect(
    useCallback(() => {
      refreshAssignments();
      refreshSummary();
      const id = setInterval(() => {
        refreshAssignments();
      }, 15_000);
      return () => clearInterval(id);
    }, [refreshAssignments, refreshSummary]),
  );

  // Also refresh whenever a new socket event lands (accept/cancel may originate
  // from elsewhere — e.g. a customer-side cancellation while we're on this tab).
  useEffect(() => {
    if (newOrder || cancelledOrder) {
      refreshAssignments();
      refreshSummary();
    }
  }, [newOrder, cancelledOrder, refreshAssignments, refreshSummary]);

  const activeOrders = useMemo(
    () => assignments.filter((a) => ACTIVE_STATUSES.has(a.status)),
    [assignments],
  );
  const nearbyOrders = useMemo(
    () => assignments.filter((a) => a.status === "assigned"),
    [assignments],
  );
  const activeOrder = activeOrders[0] ?? null;

  const handleToggle = useCallback(
    async (_value: boolean) => {
      if (statusBusy || !driver) return;
      setStatusBusy(true);
      try {
        await updateStatus(!driver.isOnline);
      } catch (err) {
        console.warn("Status toggle failed:", (err as ApiError)?.message);
      } finally {
        setStatusBusy(false);
      }
    },
    [statusBusy, driver, updateStatus],
  );

  const handleAcceptNearby = async (orderId: string) => {
    if (acting[orderId]) return;
    setActing((m) => ({ ...m, [orderId]: true }));
    try {
      await ordersApi.accept(orderId);
      await refreshAssignments();
      router.push({
        pathname: "/orders/active_delivery_screen",
        params: { id: orderId },
      });
    } catch (err) {
      console.warn("Accept failed:", (err as ApiError)?.message);
    } finally {
      setActing((m) => ({ ...m, [orderId]: false }));
    }
  };

  const handleDeclineNearby = async (orderId: string) => {
    if (acting[orderId]) return;
    setActing((m) => ({ ...m, [orderId]: true }));
    try {
      await ordersApi.reject(orderId, { reason: "too_far" });
      await refreshAssignments();
    } catch (err) {
      console.warn("Decline failed:", (err as ApiError)?.message);
    } finally {
      setActing((m) => ({ ...m, [orderId]: false }));
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={{}}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={[styles.header, { flexDirection: dir }]}>
          <TouchableOpacity
            onPress={() => router.push("./profile/profile_screen")}
          >
            <View style={styles.profileWrap}>
              <Image
                source={avatarSource(driver?.avatar)}
                style={styles.profileImg}
              />
              <View
                style={[
                  styles.onlineDot,
                  !driver?.isOnline && { backgroundColor: "#9ca3af" },
                ]}
              />
            </View>
          </TouchableOpacity>
          <OpenStatusToggle
            isOpen={driver?.isOnline ?? false}
            onToggle={handleToggle}
          />
        </View>

        {/* ── Today's Summary Card ── */}
        <View style={styles.summaryCard}>
          <View style={[styles.summaryTop, { flexDirection: dir }]}>
            <Text style={[styles.summaryTitle, { fontFamily: font.semibold }]}>
              {t("orders.todaySummary")}
            </Text>
            <Ionicons name="bar-chart-outline" size={scale(22)} color="#fff" />
          </View>
          <View style={[styles.summaryBottom, { flexDirection: dir }]}>
            <View style={{ alignItems: rtl ? "flex-end" : "flex-start" }}>
              <Text
                style={[
                  styles.earningsLabel,
                  { fontFamily: font.medium, letterSpacing: rtl ? 0 : 0.8 },
                ]}
              >
                {t("orders.earnings")}
              </Text>
              <Text style={[styles.earningsAmount, { fontFamily: font.bold }]}>
                {todayEarnings} {t("common.iqd")}
              </Text>
            </View>
            <View style={{ alignItems: rtl ? "flex-start" : "flex-end" }}>
              <Text
                style={[
                  styles.ordersLabel,
                  { fontFamily: font.medium, letterSpacing: rtl ? 0 : 0.8 },
                ]}
              >
                {t("orders.ordersLabel")}
              </Text>
              <Text style={[styles.ordersCount, { fontFamily: font.bold }]}>
                {String(todayCount).padStart(2, "0")}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Active Orders ── */}
        <View style={[styles.sectionRow, { flexDirection: dir }]}>
          <Text style={[styles.sectionTitle, { fontFamily: font.semibold }]}>
            {t("orders.activeOrders")}
          </Text>
          <View style={[styles.badge, { left: scale(190) }]}>
            <Text style={[styles.badgeText, { fontFamily: font.bold }]}>
              {activeOrders.length}
            </Text>
          </View>
        </View>

        {/* Active Order Card */}
        {activeOrder && (
          <View style={styles.activeCard}>
            <View style={[styles.activeTop, { flexDirection: dir }]}>
              <View
                style={[
                  {
                    flexDirection: dir,
                    alignItems: "center",
                    gap: scale(10),
                    flex: 1,
                  },
                ]}
              >
                <Image
                  source={storeSource(activeOrder.order?.store?.avatar)}
                  style={styles.restaurantLogo}
                />
                <View
                  style={{
                    flex: 1,
                    alignItems: rtl ? "flex-end" : "flex-start",
                  }}
                >
                  <Text
                    style={[styles.restaurantName, { fontFamily: font.bold }]}
                  >
                    {localizeName(activeOrder.order?.store?.name, langKey)}
                  </Text>
                  <Text
                    style={[styles.customerName, { fontFamily: font.regular }]}
                  >
                    {t("orders.customer")}:{" "}
                    {activeOrder.order?.customer?.name ?? "—"}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: rtl ? "flex-start" : "flex-end" }}>
                <Text style={[styles.orderPrice, { fontFamily: font.bold }]}>
                  {formatCurrency(
                    activeOrder.order?.total,
                    activeOrder.order?.currency ?? "IQD",
                  )}
                </Text>
                <Text
                  style={[styles.orderDistance, { fontFamily: font.regular }]}
                >
                  {Number(activeOrder.distanceKm ?? 0).toFixed(1)}{" "}
                  {t("orders.kmAway")}
                </Text>
              </View>
            </View>

            <View style={[styles.activeBottom, { flexDirection: dir }]}>
              <View
                style={[
                  { flexDirection: dir, alignItems: "center", gap: scale(4) },
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={scale(14)}
                  color={Colors.textSecondary}
                />
                <Text
                  style={[styles.locationText, { fontFamily: font.regular }]}
                >
                  {activeOrder.order?.store?.address ?? ""}
                </Text>
              </View>
              <View style={[styles.timerPill, { flexDirection: dir }]}>
                <Ionicons
                  name="time-outline"
                  size={scale(13)}
                  color="#e05c7a"
                />
                <Text style={[styles.timerText, { fontFamily: font.medium }]}>
                  {formatDurationMinutes(activeOrder.estimatedMinutes)}
                </Text>
              </View>
            </View>

            {/* Start Delivery Button */}
            <LinearGradient
              colors={["#BA97FF", "#8140FF", "#BC99FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.startBtn}
            >
              <TouchableOpacity
                style={styles.startBtnInner}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/orders/active_delivery_screen",
                    params: { id: activeOrder.orderId },
                  })
                }
              >
                <Text
                  style={[styles.startBtnText, { fontFamily: font.semibold }]}
                >
                  {t("orders.startDelivery")}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* ── New Orders Nearby ── */}
        <View style={styles.newOrder}>
          <View style={[styles.sectionRow, { flexDirection: dir }]}>
            <Text style={[styles.sectionTitle, { fontFamily: font.semibold }]}>
              {t("orders.newOrdersNearby")}
            </Text>
            <View
              style={[styles.badge, { left: rtl ? scale(185) : scale(150) }]}
            >
              <Text style={[styles.badgeText, { fontFamily: font.bold }]}>
                {nearbyOrders.length}
              </Text>
            </View>
          </View>

          {nearbyOrders.map((a) => {
            const restaurant = localizeName(a.order?.store?.name, langKey);
            const location = a.order?.store?.address ?? "";
            const logo = a.order?.store?.avatar;
            const price = formatCurrency(
              a.order?.total,
              a.order?.currency ?? "IQD",
            );
            const pickup = a.order?.store?.address ?? "";
            const dropoffText = (() => {
              const da = a.order?.deliveryAddress;
              if (!da) return "";
              const parts = [da.building, da.street].filter(
                Boolean,
              ) as string[];
              return parts.join(", ");
            })();
            const isActing = !!acting[a.orderId];
            return (
              <View key={a.id} style={styles.nearbyCard}>
                {/* Top row */}
                <View style={[styles.nearbyTop, { flexDirection: dir }]}>
                  <View
                    style={[
                      {
                        flexDirection: dir,
                        alignItems: "center",
                        gap: scale(10),
                        flex: 1,
                      },
                    ]}
                  >
                    <Image source={storeSource(logo)} style={styles.nearbyLogo} />
                    <View
                      style={{
                        flex: 1,
                        alignItems: rtl ? "flex-end" : "flex-start",
                      }}
                    >
                      <Text
                        style={[
                          styles.restaurantName,
                          { fontFamily: font.bold },
                        ]}
                      >
                        {restaurant}
                      </Text>
                      <View
                        style={[
                          {
                            flexDirection: dir,
                            alignItems: "center",
                            gap: scale(3),
                          },
                        ]}
                      >
                        <Ionicons
                          name="location-outline"
                          size={scale(14)}
                          color={Colors.textPrimary}
                        />
                        <Text
                          style={[
                            styles.nearbyLocation,
                            { fontFamily: font.regular },
                          ]}
                        >
                          {location}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.orderPrice, { fontFamily: font.bold }]}>
                    {price}
                  </Text>
                </View>

                {/* Pickup / Dropoff with connected line */}
                <View style={styles.routeContainer}>
                  <View
                    style={[
                      {
                        flexDirection: dir,
                        alignItems: "center",
                        gap: scale(10),
                      },
                    ]}
                  >
                    <View style={styles.dotColumn}>
                      <View style={styles.dotGray} />
                      <View style={styles.connectorLine} />
                    </View>
                    <Text
                      style={[styles.routeText, { fontFamily: font.regular }]}
                    >
                      {t("orders.pickup")}: {pickup}
                    </Text>
                  </View>
                  <View
                    style={[
                      {
                        flexDirection: dir,
                        alignItems: "center",
                        gap: scale(10),
                      },
                    ]}
                  >
                    <View style={styles.dotGreenOuter}>
                      <View style={styles.dotGreenInner} />
                    </View>
                    <Text
                      style={[styles.routeText, { fontFamily: font.regular }]}
                    >
                      {t("orders.dropoff")}: {dropoffText}
                    </Text>
                  </View>
                </View>

                {/* Action buttons */}
                <View style={[styles.actionRow, { flexDirection: dir }]}>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    activeOpacity={0.75}
                    disabled={isActing}
                    onPress={() => handleDeclineNearby(a.orderId)}
                  >
                    <Text
                      style={[
                        styles.declineBtnText,
                        { fontFamily: font.medium },
                      ]}
                    >
                      {t("orders.decline")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    activeOpacity={0.85}
                    disabled={isActing}
                    onPress={() => handleAcceptNearby(a.orderId)}
                  >
                    <Text
                      style={[
                        styles.acceptBtnText,
                        { fontFamily: font.semibold },
                      ]}
                    >
                      {t("orders.accept")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: scale(70),
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  profileWrap: { position: "relative" },
  profileImg: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(23),
    borderWidth: 2,
    borderColor: "#fff",
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#fff",
  },
  toggleBtn: {
    width: scale(56),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnOn: { backgroundColor: "#22c55e" },
  summaryCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: "#1a1a2e",
    borderRadius: Radius.xl,
    padding: spacing.lg,
  },
  summaryTop: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  summaryTitle: { fontSize: FontSize.lg, color: "#fff" },
  summaryBottom: { justifyContent: "space-between", alignItems: "flex-end" },
  earningsLabel: {
    fontSize: FontSize.sm,
    color: "#DCC6F3",
    marginBottom: scale(2),
  },
  earningsAmount: { fontSize: FontSize.xl, color: "#a78bfa" },
  ordersLabel: {
    fontSize: FontSize.sm,
    color: "#DCC6F3",
    marginBottom: scale(2),
  },
  ordersCount: { fontSize: FontSize.xxl, color: "#fff" },
  sectionRow: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: FontSize.lg, color: Colors.textPrimary },
  badge: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: "#F8F8F8",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: FontSize.xs, color: Colors.textPrimary },
  activeCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    backgroundColor: "#fff",
    borderColor: Colors.inputBg,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: spacing.lg,
    ...Shadow.subtle,
  },
  activeTop: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  restaurantLogo: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    borderColor: Colors.primary,
    borderWidth: 1,
    backgroundColor: "#f3f3f3",
  },
  restaurantName: { fontSize: FontSize.md, color: Colors.textPrimary },
  customerName: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: scale(2),
  },
  orderPrice: { fontSize: FontSize.lg, color: Colors.textPrimary },
  orderDistance: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: scale(2),
  },
  activeBottom: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  locationText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  timerPill: {
    alignItems: "center",
    gap: scale(3),
    backgroundColor: "#fff0f4",
    borderRadius: Radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: scale(4),
  },
  timerText: { fontSize: FontSize.xs, color: "#e05c7a" },
  startBtn: { borderRadius: Radius.full, overflow: "hidden" },
  startBtnInner: {
    paddingVertical: verticalScale(14),
    alignItems: "center",
    justifyContent: "center",
  },
  startBtnText: { fontSize: FontSize.md, color: "#fff" },
  newOrder: {
    backgroundColor: "#F5F4F8",
    paddingVertical: verticalScale(20),
    borderTopWidth: 1,
    borderTopColor: "#dedde0cb",
  },
  nearbyCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: "#fff",
    borderRadius: Radius.xl,
    padding: spacing.lg,
    paddingVertical: spacing.lg,
    shadowColor: "#00000015",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  nearbyTop: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  nearbyLogo: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: "#f3f3f3",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  nearbyLocation: { fontSize: fontSize.sm, color: Colors.textPrimary },
  routeRow: { gap: scale(6), marginBottom: spacing.md, paddingLeft: scale(2) },
  routeText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: scale(2),
  },
  dotGray: {
    width: scale(15),
    height: scale(15),
    borderRadius: scale(10),
    backgroundColor: "#6b7280",
    borderColor: "#E8E7EFEE",
    borderWidth: 3,
    marginBottom: -scale(2),
  },
  dotGreen: {
    width: scale(15),
    height: scale(15),
    borderRadius: scale(10),
    backgroundColor: "#22c55e",
    borderWidth: 3,
  },
  routeContainer: {
    marginBottom: spacing.md,
    paddingLeft: scale(2),
  },
  dotColumn: {
    alignItems: "center",
    width: scale(14),
  },
  connectorLine: {
    width: 2,
    height: verticalScale(10),
    backgroundColor: "#E8E7EFEE",
    marginBottom: -scale(3),
  },
  dotGreenOuter: {
    width: scale(15),
    height: scale(15),
    borderRadius: scale(10),
    backgroundColor: "#D4F8E2",
    alignItems: "center",
    justifyContent: "center",
  },
  dotGreenInner: {
    width: scale(9),
    height: scale(9),
    borderRadius: scale(10),
    backgroundColor: "#22c55e",
  },
  actionRow: { gap: spacing.sm },
  declineBtn: {
    flex: 1,
    height: verticalScale(46),
    borderRadius: Radius.full,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtnText: { fontSize: FontSize.md, color: Colors.textSecondary },
  acceptBtn: {
    flex: 1,
    height: verticalScale(46),
    borderRadius: Radius.full,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtnText: { fontSize: FontSize.md, color: "#fff" },
});
