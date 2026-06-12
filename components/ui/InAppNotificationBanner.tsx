/**
 * InAppNotificationBanner
 * ────────────────────────────────────────────────────────────────────
 * A foreground toast shown when a `notification:new` socket event (or a
 * synthesized new-order alert) arrives while the app is in the foreground.
 *
 * The OS push banner only appears for FCM/APNs pushes — when the app is
 * foregrounded the backend's socket `notification:new` event arrives with no
 * accompanying OS banner, so without this component a foreground notification
 * was silent (it just appended to the inbox list, leaving the rider to find it
 * manually).
 *
 * CRITICAL (Task C): tapping the banner deep-links straight to the
 * notification's TARGET screen via the SAME resolveNotificationRoute() resolver
 * used by the OS push-tap path (utils/pushToken) and the inbox-list tap path
 * (app/inbox/index). An order notification opens the live delivery screen, a
 * support notification opens the chat — NEVER the inbox list (the inbox is only
 * the fallback for genuinely unrouteable notifications).
 * ────────────────────────────────────────────────────────────────────
 */

import { Colors, Shadow } from "@/constants/theme";
import { useSocket } from "@/context";
import { useAppFont } from "@/hooks/useAppFont";
import { useNavGuard } from "@/hooks/useNavGuard";
import {
  resolveNotificationRoute,
  type NotificationPayload,
} from "@/utils/notificationRoutes";
import { scale, spacing, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const VISIBLE_MS = 5000;

type BannerData = {
  id: string;
  title: string;
  body: string;
  payload: NotificationPayload;
};

// Map a notification type to a leading icon. Mirrors the notification kinds the
// backend emits (see DriverNotificationType).
function iconForType(type?: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "new_order":
      return "bag-handle";
    case "order_cancelled":
      return "close-circle";
    case "order_update":
      return "navigate";
    case "support":
      return "chatbubble-ellipses";
    default:
      return "notifications";
  }
}

export function InAppNotificationBanner() {
  // SocketBridges (app/_layout) owns mirroring `pushedNotification` into the
  // inbox list and clearing it; this banner only READS it to present the toast.
  const { pushedNotification } = useSocket();
  const router = useNavGuard();
  const font = useAppFont();
  const insets = useSafeAreaInsets();

  const [banner, setBanner] = useState<BannerData | null>(null);
  const translateY = useRef(new Animated.Value(-200)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastShownIdRef = useRef<string | null>(null);

  const dismiss = (then?: () => void) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    Animated.timing(translateY, {
      toValue: -200,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setBanner(null);
      then?.();
    });
  };

  // A socket notification arrived while foregrounded — show the banner.
  useEffect(() => {
    if (!pushedNotification) return;
    // The SocketBridges component owns clearing pushedNotification + mirroring
    // it into the inbox list; we only read it to present the banner. Dedupe by
    // id so a re-render can't re-trigger the same banner.
    const n = pushedNotification;
    if (lastShownIdRef.current === n.id) return;
    lastShownIdRef.current = n.id;

    const data = (n.data ?? {}) as Record<string, unknown>;
    setBanner({
      id: n.id,
      title: n.title,
      body: n.body,
      payload: {
        type: n.type,
        orderId: typeof data.orderId === "string" ? data.orderId : undefined,
        threadId: typeof data.threadId === "string" ? data.threadId : undefined,
        actionUrl: n.actionUrl ?? undefined,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushedNotification]);

  // Animate in + arm the auto-dismiss whenever a banner is set.
  useEffect(() => {
    if (!banner) return;
    translateY.setValue(-200);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
      speed: 14,
    }).start();
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => dismiss(), VISIBLE_MS);
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner?.id]);

  // Clear the pending timer on unmount.
  useEffect(
    () => () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    },
    [],
  );

  if (!banner) return null;

  const onPress = () => {
    const route = resolveNotificationRoute(banner.payload);
    // Hide the banner first, then deep-link — same resolver as the push-tap and
    // inbox-list paths, so an order notif opens the delivery screen directly.
    dismiss(() => router.push(route));
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + verticalScale(6) }]}
    >
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Pressable
          onPress={onPress}
          style={styles.banner}
          accessibilityRole="button"
        >
          <View style={styles.iconWrap}>
            <Ionicons
              name={iconForType(banner.payload.type)}
              size={scale(20)}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.textWrap}>
            <Text
              style={[styles.title, { fontFamily: font.semibold }]}
              numberOfLines={1}
            >
              {banner.title}
            </Text>
            {!!banner.body && (
              <Text
                style={[styles.body, { fontFamily: font.regular }]}
                numberOfLines={2}
              >
                {banner.body}
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => dismiss()}
            hitSlop={10}
            style={styles.closeBtn}
            accessibilityRole="button"
          >
            <Ionicons name="close" size={scale(18)} color={Colors.textMuted} />
          </Pressable>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
    elevation: 9999,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: scale(18),
    paddingVertical: verticalScale(12),
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    ...Shadow.card,
  },
  iconWrap: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { flex: 1, alignItems: "flex-start" },
  title: { fontSize: scale(14), color: Colors.textPrimary },
  body: {
    fontSize: scale(12),
    color: Colors.textSecondary,
    marginTop: verticalScale(2),
  },
  closeBtn: { padding: scale(2) },
});
