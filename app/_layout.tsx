import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DialogProvider } from "@/components/ui/AppDialog";
import { InAppNotificationBanner } from "@/components/ui/InAppNotificationBanner";
import { LanguageOnboarding } from "@/components/ui/LanguageOnboarding";
import "@/constants/i18n";
import { installGlobalErrorHandler } from "@/utils/globalErrorHandler";
import i18n, { isRTL, LANGUAGE_STORAGE_KEY } from "@/constants/i18n";
import { localizeName, type LangKey } from "@/utils/localize";
import {
  AuthProvider,
  ActiveAssignmentsProvider,
  NotificationProvider,
  SocketProvider,
  useAuth,
  useNotifications,
  useSocket,
} from "@/context";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/poppins";
import {
  useFonts as useNotoFonts,
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_600SemiBold,
  Vazirmatn_700Bold,
} from "@expo-google-fonts/vazirmatn";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { reloadAppAsync } from "expo";
// Top-level import: registers the background location task (TaskManager.defineTask
// runs at module scope) before anything can start/stop it.
import {
  startDriverTracking,
  stopDriverTracking,
} from "@/utils/locationTracking";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { I18nManager } from "react-native";

SplashScreen.preventAutoHideAsync();
// Catches errors the React ErrorBoundary can't see (setTimeout callbacks,
// unhandled promise rejections, native module rejections). Installed at
// module load so it's active before any provider runs an effect.
installGlobalErrorHandler();

function RouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "auth";
    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/auth/auth_screen");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)/onmap");
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return <>{children}</>;
}

function SocketBridges() {
  const { newOrder, pushedNotification, clearPushedNotification } = useSocket();
  const { addNotification } = useNotifications();
  const { t } = useTranslation();
  const lastNewOrderIdRef = useRef<string | null>(null);

  // Mirror "notification:new" socket events into local notifications list.
  useEffect(() => {
    if (!pushedNotification) return;
    addNotification(pushedNotification);
    clearPushedNotification();
  }, [pushedNotification, addNotification, clearPushedNotification]);

  // Add a local notification whenever a new order arrives via socket.
  useEffect(() => {
    if (!newOrder) return;
    if (lastNewOrderIdRef.current === newOrder.orderId) return;
    lastNewOrderIdRef.current = newOrder.orderId;

    // Notification text is stored at event time, so render it in the active
    // language (en/ar/ku) and pick the store name for that language too.
    const storeLabel =
      localizeName(newOrder.store?.name, i18n.language as LangKey) ||
      t("notifications.storeFallback");

    addNotification({
      type: "new_order",
      title: t("notifications.newOrderTitle", {
        number: newOrder.orderNumber,
      }),
      body: t("notifications.newOrderBody", { store: storeLabel }),
      data: { orderId: newOrder.orderId },
    });
  }, [newOrder, addNotification, t]);

  return null;
}

// App-wide GPS heartbeat: while the driver is online, utils/locationTracking
// streams positions to the backend (background task with a foreground-watcher
// fallback + offline queue), which relays order:location_update to the customer
// for live tracking. This component only maps `driver.isOnline` to start/stop —
// the single transmission path lives in that service.
function DriverLocationBroadcaster() {
  const { driver } = useAuth();
  const isOnline = driver?.isOnline === true;

  useEffect(() => {
    if (!isOnline) return;
    void startDriverTracking();
    return () => {
      // Going offline, logging out (driver → null) or unmounting all stop here.
      void stopDriverTracking();
    };
  }, [isOnline]);

  return null;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });
  const [notoLoaded] = useNotoFonts({
    Vazirmatn_400Regular,
    Vazirmatn_500Medium,
    Vazirmatn_600SemiBold,
    Vazirmatn_700Bold,
  });

  // Load the saved language and align native RTL exactly once, on mount.
  // Runtime language switching (and its single guarded reload) lives in
  // setAppLanguage() in constants/i18n.ts.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        const lang = saved ?? i18n.language;
        if (saved && saved !== i18n.language) {
          await i18n.changeLanguage(saved);
        }
        const shouldBeRTL = isRTL(lang);
        if (I18nManager.isRTL !== shouldBeRTL) {
          I18nManager.allowRTL(shouldBeRTL);
          I18nManager.forceRTL(shouldBeRTL);
          // Usually already aligned (setAppLanguage keeps them in sync); this
          // only fires if the persisted direction drifted (e.g. the OS
          // language changed). Deferred + guarded so it can't crash on launch.
          if (!__DEV__) {
            setTimeout(() => {
              reloadAppAsync().catch(() => {});
            }, 0);
          }
        }
      } catch {
        // ignore — keep whatever i18n initialised with
      }
    })();
  }, []);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded || !notoLoaded) return null;

  return (
    <ErrorBoundary>
      <DialogProvider>
        <AuthProvider>
          <NotificationProvider>
            <SocketProvider>
              <ActiveAssignmentsProvider>
              <SocketBridges />
              <DriverLocationBroadcaster />
              <RouteGuard>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="auth" />
                </Stack>
              </RouteGuard>
              {/* Foreground in-app notification toast — taps deep-link via
                  resolveNotificationRoute (same as the OS push-tap path),
                  never the inbox list. Mounted above the navigator so it
                  floats over every screen. */}
              <InAppNotificationBanner />
              <LanguageOnboarding />
              </ActiveAssignmentsProvider>
            </SocketProvider>
          </NotificationProvider>
        </AuthProvider>
      </DialogProvider>
    </ErrorBoundary>
  );
}
