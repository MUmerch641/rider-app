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
let navigationReady = false;
let pendingColdStart: Notifications.NotificationResponse | null = null;

function extractPushData(
    response: Notifications.NotificationResponse,
): Record<string, unknown> {
    const req = response.notification?.request;
    const triggerPayload = (() => {
        const t = req?.trigger as { payload?: Record<string, unknown> } | undefined;
        return t && typeof t.payload === "object" ? t.payload : undefined;
    })();
    const contentData = (req?.content?.data ?? {}) as Record<string, unknown>;
    let data = {
        ...(triggerPayload ?? {}),
        ...contentData,
    } as Record<string, unknown>;
    for (const k of ["data", "body", "aps"]) {
        const nested = data[k];
        if (nested && typeof nested === "object") {
            data = { ...data, ...(nested as Record<string, unknown>) };
        }
    }
    if (Platform.OS === "android") {
        console.log("[push] Android tap data:", data);
    }
    return data;
}

function navigateForNotification(
    response: Notifications.NotificationResponse | null,
): void {
    if (!response) return;
    try {
        const data = extractPushData(response);
        const str = (v: unknown) =>
            typeof v === "string" ? v : v != null ? String(v) : undefined;
        const payload: NotificationPayload = {
            type: str(data.type),
            orderId: str(data.orderId),
            actionUrl: str(data.actionUrl),
            threadId: str(data.threadId),
        };
        const route = resolveNotificationRoute(payload);
        if (!route) return;
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

/** Call once auth has finished loading and the root navigator is mounted. */
export function setPushNavigationReady(ready: boolean): void {
    navigationReady = ready;
    if (ready && pendingColdStart) {
        const response = pendingColdStart;
        pendingColdStart = null;
        navigateForNotification(response);
    }
}

/** Handle a cold-start notification tap after auth + router are ready. */
export function handleColdStartNotification(): void {
    void Notifications.getLastNotificationResponseAsync()
        .then((response) => {
            if (!response || lastHandledResponseAt > 0) return;
            if (!navigationReady) {
                pendingColdStart = response;
                return;
            }
            navigateForNotification(response);
        })
        .catch(() => { });
}

/**
 * Route the rider when they TAP a push notification (foreground or background).
 * Idempotent — safe to call multiple times; only the first call installs the listener.
 */
export function setupNotificationTapHandling(): void {
    if (tapHandlingInstalled) return;
    tapHandlingInstalled = true;
    try {
        Notifications.addNotificationResponseReceivedListener((response) => {
            lastHandledResponseAt = Date.now();
            navigateForNotification(response);
        });
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
