import { LanguageOnboarding } from "@/components/ui/LanguageOnboarding";
import "@/constants/i18n";
import i18n, { isRTL, LANGUAGE_STORAGE_KEY } from "@/constants/i18n";
import { AuthProvider, NotificationProvider, SocketProvider, useAuth, useNotifications, useSocket } from "@/context";
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
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import * as Location from "expo-location";
import { I18nManager } from "react-native";

SplashScreen.preventAutoHideAsync();

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
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return <>{children}</>;
}

function SocketBridges() {
  const { newOrder, pushedNotification, clearPushedNotification } = useSocket();
  const { addNotification } = useNotifications();
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

    const storeName = newOrder.store?.name;
    const storeLabel =
      typeof storeName === "string"
        ? storeName
        : storeName?.en ?? storeName?.ar ?? storeName?.ku ?? "store";

    addNotification({
      type: "new_order",
      title: `Order #${newOrder.orderNumber}`,
      body: `New delivery from ${storeLabel}`,
      data: { orderId: newOrder.orderId },
    });
  }, [newOrder, addNotification]);

  return null;
}

// App-wide GPS heartbeat: while the driver is online, watch position and push
// it to the backend (which relays order:location_update to the customer for
// live tracking). Previously this lived only on the On-Map screen, so the
// customer saw no live driver location unless the rider had that screen open.
function DriverLocationBroadcaster() {
  const { driver, updateLocation } = useAuth();
  const isOnline = driver?.isOnline;

  useEffect(() => {
    if (!isOnline) return;
    let cancelled = false;
    let watcher: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;
      watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (loc) => {
          if (cancelled) return;
          updateLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            heading: loc.coords.heading ?? undefined,
          }).catch(() => undefined);
        },
      );
    })();
    return () => {
      cancelled = true;
      if (watcher) watcher.remove();
    };
  }, [isOnline, updateLocation]);

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

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((saved) => {
      if (saved && saved !== i18n.language) {
        i18n.changeLanguage(saved);
      }
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;

    const applyRTL = async () => {
      const shouldBeRTL = isRTL(i18n.language);
      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.allowRTL(shouldBeRTL);
        I18nManager.forceRTL(shouldBeRTL);
        SplashScreen.hideAsync();
        return;
      }
      SplashScreen.hideAsync();
    };

    applyRTL();
  }, [loaded]);

  if (!loaded || !notoLoaded) return null;

  return (
    <AuthProvider>
      <NotificationProvider>
        <SocketProvider>
          <SocketBridges />
          <DriverLocationBroadcaster />
          <RouteGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="auth" />
            </Stack>
          </RouteGuard>
          <LanguageOnboarding />
        </SocketProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
