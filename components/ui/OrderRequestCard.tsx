import { Colors, Radius, Shadow } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import {
  fontSize,
  radius,
  scale,
  spacing,
  verticalScale,
} from "@/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Easing,
  FlatList,
  I18nManager,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SvgXml } from "react-native-svg";

//ICONS
const LOCATION_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M9.66671 7.00038C9.66671 6.07953 8.92055 5.33337 8.00038 5.33337C7.07953 5.33337 6.33337 6.07953 6.33337 7.00038C6.33337 7.92055 7.07953 8.66671 8.00038 8.66671C8.92055 8.66671 9.66671 7.92055 9.66671 7.00038Z" stroke="black" stroke-linecap="round" stroke-linejoin="round"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M7.99967 14C7.20069 14 3 10.5989 3 7.04219C3 4.25776 5.23807 2 7.99967 2C10.7613 2 13 4.25776 13 7.04219C13 10.5989 8.79866 14 7.99967 14Z" stroke="black" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
const DURATION_SVG = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M16.125 9C16.125 12.8318 13.0193 15.9375 9.1875 15.9375C5.35575 15.9375 2.25 12.8318 2.25 9C2.25 5.16825 5.35575 2.0625 9.1875 2.0625C13.0193 2.0625 16.125 5.16825 16.125 9Z" stroke="#7C7890" stroke-width="1.125" stroke-linecap="square"/>
<path d="M11.7616 11.2067L8.93408 9.5199V5.88464" stroke="#7C7890" stroke-width="1.125" stroke-linecap="square"/>
</svg>
`;
const ROUTE_SVG = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4.5 13.5C3.675 13.5 2.96875 13.2062 2.38125 12.6187C1.79375 12.0312 1.5 11.325 1.5 10.5V4.36875C1.0625 4.20625 0.703125 3.93437 0.421875 3.55312C0.140625 3.17188 0 2.7375 0 2.25C0 1.625 0.21875 1.09375 0.65625 0.65625C1.09375 0.21875 1.625 0 2.25 0C2.875 0 3.40625 0.21875 3.84375 0.65625C4.28125 1.09375 4.5 1.625 4.5 2.25C4.5 2.7375 4.35938 3.17188 4.07812 3.55312C3.79688 3.93437 3.4375 4.20625 3 4.36875V10.5C3 10.9125 3.14687 11.2656 3.44062 11.5594C3.73438 11.8531 4.0875 12 4.5 12C4.9125 12 5.26562 11.8531 5.55937 11.5594C5.85312 11.2656 6 10.9125 6 10.5V3C6 2.175 6.29375 1.46875 6.88125 0.88125C7.46875 0.29375 8.175 0 9 0C9.825 0 10.5312 0.29375 11.1187 0.88125C11.7062 1.46875 12 2.175 12 3V9.13125C12.4375 9.29375 12.7969 9.56562 13.0781 9.94687C13.3594 10.3281 13.5 10.7625 13.5 11.25C13.5 11.875 13.2812 12.4062 12.8438 12.8438C12.4062 13.2812 11.875 13.5 11.25 13.5C10.625 13.5 10.0938 13.2812 9.65625 12.8438C9.21875 12.4062 9 11.875 9 11.25C9 10.7625 9.14062 10.325 9.42188 9.9375C9.70312 9.55 10.0625 9.28125 10.5 9.13125V3C10.5 2.5875 10.3531 2.23438 10.0594 1.94062C9.76562 1.64687 9.4125 1.5 9 1.5C8.5875 1.5 8.23438 1.64687 7.94063 1.94062C7.64688 2.23438 7.5 2.5875 7.5 3V10.5C7.5 11.325 7.20625 12.0312 6.61875 12.6187C6.03125 13.2062 5.325 13.5 4.5 13.5Z" fill="#7C7890"/>
</svg>
`;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface OrderItem {
  id: string;
  quantity: number;
  name: string;
  price: number;
}

export interface OrderRequestCardProps {
  visible: boolean;

  // Restaurant
  restaurantName: string;
  restaurantLocation: string;
  restaurantLogo?: string;

  // Order
  items: OrderItem[];
  totalDistance?: string;
  totalDuration?: string;

  // Timer
  timerSeconds?: number;

  // Callbacks
  onAccept: () => void;
  onDecline: () => void;
  onTimerEnd?: () => void;
  bottomOffset?: number;
  // i18n
  translations?: {
    orderItems?: string;
    acceptOrder?: string;
    declineRequest?: string;
    kmTotal?: string;
    min?: string;
  };

  currency?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
const OrderRequestCard: React.FC<OrderRequestCardProps> = ({
  visible,
  restaurantName,
  restaurantLocation,
  restaurantLogo,
  items = [],
  totalDistance,
  totalDuration,
  timerSeconds = 10,
  onAccept,
  onDecline,
  onTimerEnd,
  currency = "IQD",
  bottomOffset = verticalScale(180),
}) => {
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  // Direction is owned by native RTL (session-constant); only used to drop
  // letterSpacing for Arabic-script fonts, matching orders/index.tsx.
  const rtl = I18nManager.isRTL;

  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  // onTimerEnd fires a network reject + clears the offer in the parent. Keep it
  // in a ref so the interval always calls the latest callback (the effect only
  // re-runs on visible/timerSeconds) and a `firedRef` so it can fire at most
  // once per offer — a double auto-decline raced the accept path.
  const onTimerEndRef = useRef(onTimerEnd);
  onTimerEndRef.current = onTimerEnd;
  const firedRef = useRef(false);

  const formatPrice = (price: number) =>
    `${(price ?? 0).toLocaleString()} ${currency}`;

  // ─── Card entrance animation ─────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      // Reset
      firedRef.current = false;
      cardAnim.setValue(0);
      progressAnim.setValue(1);
      setTimeLeft(timerSeconds);

      // Slide up card
      Animated.spring(cardAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();

      // Progress bar
      animRef.current = Animated.timing(progressAnim, {
        toValue: 0,
        duration: timerSeconds * 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      });
      animRef.current.start();

      // Countdown. NOTE: never call onTimerEnd from INSIDE the setState updater
      // — that runs during render and React throws "Cannot update a component
      // while rendering a different component" when the parent setStates in
      // response. Detect the hit-zero edge, then clear the timer and schedule
      // onTimerEnd on the next tick (guarded by firedRef so it can't run twice).
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            if (!firedRef.current) {
              firedRef.current = true;
              setTimeout(() => onTimerEndRef.current?.(), 0);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      animRef.current?.stop();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      animRef.current?.stop();
    };
  }, [visible, timerSeconds]);

  const cardTranslateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });

  const cardOpacity = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const renderItem = ({ item }: { item: OrderItem }) => (
    <View style={styles.orderItem}>
      <Text style={styles.itemQuantity}>{item.quantity}x</Text>
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
    </View>
  );

  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: bottomOffset }]}
    >
      <Animated.View
        pointerEvents="auto"
        style={[
          styles.card,
          {
            opacity: cardOpacity,
            transform: [{ translateY: cardTranslateY }],
          },
        ]}
      >
        {/* ── Progress Bar ── */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              { width: progressWidth, alignSelf: "flex-start" },
            ]}
          />
        </View>

        <View style={styles.cardInner}>
          {/* ── Restaurant Row ── */}
          <View style={styles.restaurantRow}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              {restaurantLogo ? (
                <Image
                  source={{
                    uri: restaurantLogo,
                  }}
                  style={styles.logo}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoPlaceholderText}>
                    {(restaurantName ?? "").charAt(0) || "?"}
                  </Text>
                </View>
              )}
            </View>

            {/* Name + Location */}
            <View style={styles.restaurantInfo}>
              <Text style={[styles.restaurantName]} numberOfLines={1}>
                {restaurantName}
              </Text>
              <View style={styles.locationRow}>
                <SvgXml xml={LOCATION_SVG} width={16} height={16} />
                <Text style={styles.locationText}>{restaurantLocation}</Text>
              </View>
            </View>

            <View style={{ flex: 1 }} />

            {/* Timer Circle */}
            <View style={[styles.timerCircle]}>
              <Text style={[styles.timerText]}>{timeLeft}s</Text>
            </View>
          </View>

          {/* ── Stats Row ── */}
          {(totalDistance || totalDuration) && (
            <View style={styles.statsRow}>
              {totalDistance && (
                <View style={styles.statItem}>
                  <SvgXml xml={ROUTE_SVG} width={13} height={13} />
                  <Text style={styles.statText}>{totalDistance}</Text>
                </View>
              )}
              {totalDuration && (
                <View style={styles.statItem}>
                  <SvgXml xml={DURATION_SVG} width={18} height={18} />
                  <Text style={styles.statText}>{totalDuration}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Order Items ── */}
          <View style={styles.orderItemCard}>
            <Text
              style={[
                styles.sectionLabel,
                { fontFamily: font.medium, letterSpacing: rtl ? 0 : 1.2 },
              ]}
            >
              {t("orderRequestCard.orderItems")}
            </Text>

            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              scrollEnabled={false}
            />
          </View>

          {/* ── Accept Button ── */}
          <LinearGradient
            colors={["#BA97FF", "#8140FF", "#BC99FF"]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 0 }}
            style={styles.acceptBtnGrad}
          >
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={onAccept}
              activeOpacity={0.85}
            >
              <View style={styles.acceptIconCircle}>
                <Text style={styles.acceptIcon}>✓</Text>
              </View>
              <Text
                style={[
                  styles.acceptText,
                  { fontFamily: font.medium, letterSpacing: rtl ? 0 : 0.3 },
                ]}
              >
                {t("orderRequestCard.acceptOrder")}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
          {/* ── Decline Button ── */}
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={onDecline}
            activeOpacity={0.7}
          >
            <Text style={[styles.declineText, { fontFamily: font.medium }]}>
              {t("orderRequestCard.declineRequest")}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: scale(20),
    right: scale(20),
    alignItems: "center",
    // Must sit ABOVE AcceptedOrdersSheet (zIndex 100) so the Accept/Decline
    // buttons stay tappable even when the rider expands the sheet — we no longer
    // force-collapse the sheet during an offer.
    zIndex: 200,
    elevation: 200,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    padding: scale(10),
    backgroundColor: "#FFFFFF",
    borderRadius: scale(50),
    overflow: "hidden",
    paddingVertical: scale(20),
  },

  cardInner: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },

  // Progress Bar
  progressTrack: {
    marginTop: 10,
    height: 6,
    backgroundColor: "#0000001A",
    width: "80%",
    alignSelf: "center",
    borderRadius: radius.full,
  },
  progressBar: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: "#7900F3",
  },

  // Restaurant Row
  restaurantRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  logoContainer: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F0E6FF",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  logoPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#7900F3",
    alignItems: "center",
    justifyContent: "center",
  },
  logoPlaceholderText: {
    color: "#FFFFFF",
    fontSize: fontSize.base,
    fontWeight: "700",
  },
  restaurantInfo: {
    maxWidth: "100%",
    marginHorizontal: scale(4),
    alignItems: "flex-start",
  },
  restaurantName: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 3,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: fontSize.sm,
    color: "#8A7FA0",
  },

  // Timer
  timerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderStyle: "solid",
    alignItems: "center",
    borderColor: "#000",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },
  timerText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: "#5A4F6E",
    fontWeight: "500",
    left: -scale(4),
    marginLeft: 6,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#E8DFF5",
    marginHorizontal: 12,
  },

  // Order Items
  orderItemCard: {
    borderRadius: radius.xxl,
    borderWidth: 0.5,
    borderColor: Colors.inputBg,
    padding: spacing.lg,
    marginBottom: scale(10),
    ...Shadow.soft,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B0A0C8",
    marginBottom: 10,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    width: 32,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
    marginLeft: 8,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
  },

  // Accept Button
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 15,
    marginBottom: 4,
    gap: 10,
    shadowColor: "#7900F3",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  acceptBtnGrad: {
    borderRadius: Radius.full,
    overflow: "hidden",
    marginBottom: verticalScale(12),
  },
  acceptIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 13,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  acceptIcon: {
    fontSize: 12,
    color: "#7900F3",
    fontWeight: "700",
  },
  acceptText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Decline Button
  declineBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  declineText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8A7FA0",
  },
});

export default OrderRequestCard;
