import { OpenStatusToggle } from "@/components/ui";
import { isRTL } from "@/constants/i18n";
import { Colors, FontSize, Radius, Shadow } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { fontSize, scale, spacing, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
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

const ACTIVE_ORDER = {
  id: "a1",
  restaurant: "The Grill",
  customer: "Ahmed J.",
  price: "4,000IQD",
  distance: "2.4",
  location: "Sulaymany-baxtyari",
  timer: "12:45",
  logo: "https://tse1.mm.bing.net/th/id/OIP.AiK2XKBbcs31B24ebg5mAQHaGL?rs=1&pid=ImgDetMain",
};

const NEARBY_ORDERS = [
  {
    id: "n1",
    restaurant: "The Grill",
    location: "Sulaymany-baxtyari",
    price: "4,000IQD",
    pickup: "Baxtyary",
    dropoff: "Ashty Street",
    logo: "https://tse1.mm.bing.net/th/id/OIP.AiK2XKBbcs31B24ebg5mAQHaGL?rs=1&pid=ImgDetMain",
  },
  {
    id: "n2",
    restaurant: "The Grill",
    location: "Sulaymany-baxtyari",
    price: "4,000IQD",
    pickup: "Baxtyary",
    dropoff: "Ashty Street",
    logo: "https://tse1.mm.bing.net/th/id/OIP.AiK2XKBbcs31B24ebg5mAQHaGL?rs=1&pid=ImgDetMain",
  },
];

export default function OrdersScreen() {
  const font = useAppFont();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const rtl = isRTL(i18n.language);
  const dir = rtl ? "row-reverse" : "row";

  const [isOpen, setIsOpen] = useState(true);

  const handleToggle = (value: boolean) => {
    setIsOpen(value);
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
                source={{
                  uri: "https://media.istockphoto.com/id/1038692170/photo/smiling-courier-man-holding-a-box-package.jpg?s=612x612&w=0&k=20&c=IhJYTjkchSQwnNIx0hY4ExkCoLQZatyZt-MwCgL7GF4=",
                }}
                style={styles.profileImg}
              />
              <View style={styles.onlineDot} />
            </View>
          </TouchableOpacity>
          <OpenStatusToggle isOpen={isOpen} onToggle={handleToggle} />
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
                25,000 {t("common.iqd")}
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
                08
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
            <Text style={[styles.badgeText, { fontFamily: font.bold }]}>1</Text>
          </View>
        </View>

        {/* Active Order Card */}
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
                source={{ uri: ACTIVE_ORDER.logo }}
                style={styles.restaurantLogo}
              />
              <View
                style={{ flex: 1, alignItems: rtl ? "flex-end" : "flex-start" }}
              >
                <Text
                  style={[styles.restaurantName, { fontFamily: font.bold }]}
                >
                  {ACTIVE_ORDER.restaurant}
                </Text>
                <Text
                  style={[styles.customerName, { fontFamily: font.regular }]}
                >
                  {t("orders.customer")}: {ACTIVE_ORDER.customer}
                </Text>
              </View>
            </View>
            <View style={{ alignItems: rtl ? "flex-start" : "flex-end" }}>
              <Text style={[styles.orderPrice, { fontFamily: font.bold }]}>
                {ACTIVE_ORDER.price}
              </Text>
              <Text
                style={[styles.orderDistance, { fontFamily: font.regular }]}
              >
                {ACTIVE_ORDER.distance} {t("orders.kmAway")}
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
              <Text style={[styles.locationText, { fontFamily: font.regular }]}>
                {ACTIVE_ORDER.location}
              </Text>
            </View>
            <View style={[styles.timerPill, { flexDirection: dir }]}>
              <Ionicons name="time-outline" size={scale(13)} color="#e05c7a" />
              <Text style={[styles.timerText, { fontFamily: font.medium }]}>
                {ACTIVE_ORDER.timer}
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
              onPress={() => router.push("/orders/active_delivery_screen")}
            >
              <Text
                style={[styles.startBtnText, { fontFamily: font.semibold }]}
              >
                {t("orders.startDelivery")}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

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
                {NEARBY_ORDERS.length}
              </Text>
            </View>
          </View>

          {NEARBY_ORDERS.map((order) => (
            <View key={order.id} style={styles.nearbyCard}>
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
                  <Image
                    source={{ uri: order.logo }}
                    style={styles.nearbyLogo}
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
                      {order.restaurant}
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
                        {order.location}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={[styles.orderPrice, { fontFamily: font.bold }]}>
                  {order.price}
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
                    {t("orders.pickup")}: {order.pickup}
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
                    {t("orders.dropoff")}: {order.dropoff}
                  </Text>
                </View>
              </View>

              {/* Action buttons */}
              <View style={[styles.actionRow, { flexDirection: dir }]}>
                <TouchableOpacity
                  style={styles.declineBtn}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[styles.declineBtnText, { fontFamily: font.medium }]}
                  >
                    {t("orders.decline")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptBtn} activeOpacity={0.85}>
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
          ))}
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
