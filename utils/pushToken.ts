import i18n from "@/constants/i18n";
import {
    resolveNotificationRoute,
    type NotificationPayload,
} from "@/utils/notificationRoutes";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";

let configured = false;
let tapHandlingInstalled = false;
let lastHandledResponseAt = 0;

/**
 * Navigate to the page a tapped notification targets. Resolves the backend
 * `data`/`actionUrl` to a REAL expo-router route — never the raw actionUrl,
 * which would land the rider on the "Unmatched Route" screen.
 */
function navigateForNotification(
    response: Notifications.NotificationResponse | null,
): void {
    if (!response) return;
    try {
        const req = response.notification?.request;
        // On iOS, expo-notifications delivers a REMOTE push's custom keys in
        // `request.trigger.payload` (the raw APNs dict, incl. `aps`) — NOT in
        // `content.data`, which is empty for pushes. Merge both (+ any nested
        // data/body/aps) so the routing fields are found on every platform.
        const triggerPayload = (() => {
            const t = req?.trigger as { payload?: Record<string, unknown> } | undefined;
            return t && typeof t.payload === "object" ? t.payload : undefined;
        })();
        let data = {
            ...(triggerPayload ?? {}),
            ...((req?.content?.data ?? {}) as Record<string, unknown>),
        } as Record<string, unknown>;
        for (const k of ["data", "body", "aps"]) {
            const nested = data[k];
            if (nested && typeof nested === "object") {
                data = { ...data, ...(nested as Record<string, unknown>) };
            }
        }
        const str = (v: unknown) =>
            typeof v === "string" ? v : v != null ? String(v) : undefined;
        const payload: NotificationPayload = {
            type: str(data.type),
            orderId: str(data.orderId),
            actionUrl: str(data.actionUrl),
            threadId: str(data.threadId),
        };
        const route = resolveNotificationRoute(payload);
        // Defer slightly so the root navigator is mounted on cold start.
        setTimeout(() => {
            try {
                router.push(route);
            } catch (e) {
                console.warn("push: navigation for notification tap failed", e);
            }
        }, 350);
    } catch (e) {
        console.warn("push: failed to handle notification tap", e);
    }
}

/**
 * Route the rider when they TAP a push notification (foreground, background,
 * or cold start) straight to its target page. Idempotent — safe to call
 * multiple times; only the first call installs the listener.
 */
export function setupNotificationTapHandling(): void {
    if (tapHandlingInstalled) return;
    tapHandlingInstalled = true;
    try {
        Notifications.addNotificationResponseReceivedListener((response) => {
            lastHandledResponseAt = Date.now();
            navigateForNotification(response);
        });
        // Cold start: the tap that launched the app fires before any listener
        // exists — fetch it explicitly. Skip if the live listener already ran.
        void Notifications.getLastNotificationResponseAsync()
            .then((response) => {
                if (!response || lastHandledResponseAt > 0) return;
                navigateForNotification(response);
            })
            .catch(() => {});
    } catch {
        // Notifications API unavailable (Expo Go on iOS, web) — ignore.
    }
}

/**
 * Configure how foreground push notifications are displayed.
 * Idempotent — safe to call multiple times.
 */
export function configurePushHandler(): void {
    if (configured) return;
    configured = true;
    try {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });
    } catch {
        // Handler may not be available in some Expo Go contexts — ignore.
    }
}

/**
 * Request permission and return the device push token.
 * Returns null when running on a simulator, when permission is denied,
 * or when the API isn't available (Expo Go on iOS, web, etc.).
 */
export async function registerForPushNotifications(): Promise<string | null> {
    try {
        if (!Device.isDevice) return null;

        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync({
                ios: {
                    allowAlert: true,
                    allowBadge: true,
                    allowSound: true,
                    // Also prompt for Critical Alerts (full volume, bypass the
                    // silent switch + Focus/DND) so backgrounded silenced phones
                    // still ring for orders. No-op until the app ships the
                    // Apple-granted critical-alerts entitlement; safe to request.
                    allowCriticalAlerts: true,
                },
            });
            finalStatus = status;
        }
        if (finalStatus !== "granted") return null;

        if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync("default", {
                name: "default",
                importance: Notifications.AndroidImportance.MAX,
            });
            // High-importance channel for new-order pushes — must match the
            // backend FCM channelId 'orders' so Android plays sound + vibrates
            // when the app is backgrounded/closed. Without this the new-order
            // push lands on the silent default channel (no sound, no vibrate).
            await Notifications.setNotificationChannelAsync("orders", {
                name: i18n.t("notifications.newOrdersChannel"),
                importance: Notifications.AndroidImportance.MAX,
                sound: "default",
                vibrationPattern: [0, 600, 400, 600],
                enableVibrate: true,
            });
        }

        const token = await Notifications.getDevicePushTokenAsync();
        return token?.data ?? null;
    } catch {
        return null;
    }
}
