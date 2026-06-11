import i18n from "@/constants/i18n";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

let configured = false;

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
