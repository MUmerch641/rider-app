import { ordersApi, walletApi, type ApiError } from "@/api";
import {
  AcceptedOrderItem,
  AcceptedOrdersSheet,
} from "@/components/ui/AcceptedOrdersSheet";
import DriverStatusHeader from "@/components/ui/DriverStatusHeader";
import { LocationDotIcon } from "@/components/ui/icons/LocationDotIcon";
import OrderRequestCard from "@/components/ui/OrderRequestCard";
import { isRTL } from "@/constants/i18n";
import { Colors, Shadow } from "@/constants/theme";
import { useAuth, useSocket } from "@/context";
import {
  formatCurrency,
  formatDistanceKm,
  formatDurationMinutes,
  formatNumber,
} from "@/utils/format";
import { localizeName, type LangKey } from "@/utils/localize";
import { storeSource } from "@/utils/placeholders";
import { radius, scale, spacing, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { t } from "i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { updateOrderStatusWithGps } from "@/utils/orderStatusGps";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

const RIDER_IMAGE = require("@/assets/images/driver/setPointRoute.png");

// ─── Configuration ────────────────────────────────────────────────────────────
const GOOGLE_DIRECTIONS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Default zoom level. The map centers on the rider's real GPS (see the on-mount
// GPS effect) — never a hardcoded city. The map is not rendered until the first
// GPS fix arrives, so there is no placeholder region to leak.
const DEFAULT_DELTA = {
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Coordinate {
  latitude: number;
  longitude: number;
}

interface LocationInfo {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface RouteInfo {
  coordinates: Coordinate[];
  distance: string;
  duration: string;
}

// ─── Polyline Decoder ─────────────────────────────────────────────────────────
function decodePolyline(encoded: string): Coordinate[] {
  const coordinates: Coordinate[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const factor = Math.pow(10, 5);

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const latitudeDelta = result & 1 ? ~(result >> 1) : result >> 1;
    latitude += latitudeDelta;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const longitudeDelta = result & 1 ? ~(result >> 1) : result >> 1;
    longitude += longitudeDelta;

    coordinates.push({
      latitude: latitude / factor,
      longitude: longitude / factor,
    });
  }

  return coordinates;
}

// ─── Directions API ───────────────────────────────────────────────────────────
async function fetchDirections(
  origin: Coordinate,
  destination: Coordinate,
): Promise<RouteInfo | null> {
  if (!GOOGLE_DIRECTIONS_API_KEY) {
    console.warn(
      "Google Directions API key not found. Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file",
    );
    return null;
  }

  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    `&mode=driving` +
    `&key=${GOOGLE_DIRECTIONS_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();

    if (data.status !== "OK") {
      console.warn("Directions API error:", data.status, data.error_message);
      return null;
    }

    if (!data.routes?.length) {
      console.warn("No routes found");
      return null;
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    return {
      coordinates: decodePolyline(route.overview_polyline.points),
      distance: leg.distance.text,
      duration: leg.duration.text,
    };
  } catch (error) {
    console.error("Failed to fetch directions:", error);
    return null;
  }
}

// Straight-line fallback when Directions API fails
function generateStraightLine(
  start: Coordinate,
  end: Coordinate,
): Coordinate[] {
  const steps = 50;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const progress = i / steps;
    return {
      latitude: start.latitude + (end.latitude - start.latitude) * progress,
      longitude: start.longitude + (end.longitude - start.longitude) * progress,
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function OnMap() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const rtl = isRTL(i18n.language);
  const mapRef = useRef<MapView>(null);

  // ─── State ──────────────────────────────────────────────────────────────
  const [acceptedOrders, setAcceptedOrders] = useState<AcceptedOrderItem[]>([]);
  const [showOrder, setShowOrder] = useState(true);
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null);
  const [sheetHeight, setSheetHeight] = useState(verticalScale(160));
  const [locating, setLocating] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false); // false until GPS ready
  const [gpsReady, setGpsReady] = useState(false); // true once first fix arrives

  // Live driver position — null until GPS provides a real fix
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);

  // Destination — null until an order is accepted and a target is set
  const [activeDestination, setActiveDestination] = useState<Coordinate | null>(
    null,
  );
  const [activeMarkerImage, setActiveMarkerImage] = useState<string | null>(
    null,
  );

  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
  } | null>(null);
  const [routeError, setRouteError] = useState(false);

  const [selected, setSelected] = useState<LocationInfo>({
    name: "",
    address: "",
    latitude: 0,
    longitude: 0,
  });
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);

  // ─── Live data hooks ─────────────────────────────────────────────────────
  const { driver, updateStatus, updateLocation } = useAuth();
  const { newOrder, cancelledOrder, clearNewOrder, clearCancelledOrder } =
    useSocket();

  const langKey: LangKey = (i18n.language as LangKey) || "en";

  const [todayEarnings, setTodayEarnings] = useState<string>("0");
  const [statusBusy, setStatusBusy] = useState(false);

  const driverDisplayName = useMemo(() => {
    if (!driver) return "";
    const first = driver.firstName?.trim();
    const last = driver.lastName?.trim();
    if (first || last) return [first, last].filter(Boolean).join(" ");
    return driver.username ?? "";
  }, [driver]);

  // ─── Map socket newOrder → component-shape currentRequest ────────────────
  const currentRequest = useMemo(() => {
    if (!newOrder) return null;

    const storeGeo = newOrder.store?.location;
    // A dispatched order always carries store coordinates; fall back to 0,0 (not a
    // hardcoded city) only for malformed data so we never plant a marker in the
    // wrong city.
    const restaurantCoordinate: Coordinate = {
      latitude: storeGeo?.lat ?? 0,
      longitude: storeGeo?.lng ?? 0,
    };

    return {
      id: newOrder.orderId,
      restaurantName: localizeName(newOrder.store?.name, langKey),
      restaurantLocation: newOrder.store?.address ?? "",
      restaurantLogo: newOrder.store?.logoUrl ?? "",
      restaurantCoordinate,
      totalDistance: formatDistanceKm(newOrder.distanceKm),
      totalDuration: formatDurationMinutes(newOrder.estimatedMinutes),
      price: formatCurrency(newOrder.total, newOrder.currency ?? "IQD"),
      pickupLocation: newOrder.store?.address ?? "",
      dropoffLocation: newOrder.customer?.address ?? "",
      items: (newOrder.items ?? []).map((it) => ({
        id: it.id,
        quantity: it.quantity,
        name: localizeName(it.name, langKey),
        price: typeof it.price === "string" ? Number(it.price) : it.price,
      })),
      expiresInSeconds: newOrder.expiresInSeconds ?? 30,
    };
  }, [newOrder, langKey]);

  // ─── Route Loading ────────────────────────────────────────────────────────
  // Only called when BOTH origin and destination are real coordinates.
  const loadRoute = useCallback(
    async (origin: Coordinate, destination: Coordinate) => {
      setLoadingRoute(true);
      setRouteError(false);

      try {
        const result = await fetchDirections(origin, destination);

        if (result) {
          setRouteCoordinates(result.coordinates);
          setRouteInfo({
            distance: result.distance,
            duration: result.duration,
          });
        } else {
          // Fallback to straight line if Directions API fails
          setRouteCoordinates(generateStraightLine(origin, destination));
          setRouteError(true);
        }
      } catch {
        setRouteCoordinates(generateStraightLine(origin, destination));
        setRouteError(true);
      }

      setLoadingRoute(false);
    },
    [],
  );

  // Fit map to route whenever routeCoordinates change
  useEffect(() => {
    if (routeCoordinates.length > 0) {
      const timer = setTimeout(() => {
        mapRef.current?.fitToCoordinates(routeCoordinates, {
          edgePadding: {
            top: verticalScale(120),
            right: spacing.lg,
            bottom: verticalScale(180),
            left: spacing.lg,
          },
          animated: true,
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [routeCoordinates]);

  // When activeDestination changes (order accepted) AND we have a GPS fix → load route
  useEffect(() => {
    if (!userLocation || !activeDestination) return;
    loadRoute(userLocation, activeDestination);
  }, [activeDestination]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: intentionally NOT including userLocation here — we only re-route when
  // the destination changes, not on every GPS tick (that would be too noisy).

  // ─── GPS — acquire first fix on mount, regardless of online status ────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;

      // Single high-accuracy fix to populate the map immediately
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (cancelled) return;

      const coord: Coordinate = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setUserLocation(coord);
      setGpsReady(true);

      // Animate map to real position
      mapRef.current?.animateToRegion(
        {
          ...coord,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        600,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── GPS heartbeat — continuous tracking while driver is online ───────────
  useEffect(() => {
    if (!driver?.isOnline) return;

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
          const coord: Coordinate = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setUserLocation(coord);
          setGpsReady(true);

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
      watcher?.remove();
    };
  }, [driver?.isOnline, updateLocation]);

  // ─── Accept order ─────────────────────────────────────────────────────────
  const handleAcceptOrder = async () => {
    if (!currentRequest || !newOrder || !userLocation) return;

    const newOrderId = currentRequest.id;

    try {
      await ordersApi.accept(newOrderId);
    } catch (err) {
      console.warn("Accept failed:", (err as ApiError)?.message);
      clearNewOrder();
      return;
    }

    const accepted: AcceptedOrderItem = {
      id: newOrderId,
      restaurantName: currentRequest.restaurantName,
      restaurantAvatar: currentRequest.restaurantLogo,
      price: currentRequest.price,
      pickupLocation: currentRequest.pickupLocation,
      dropoffLocation: currentRequest.dropoffLocation,
      actionType: "go_to_restaurant",

      onGoToRestaurant: () => {
        if (activeDeliveryId) return;

        setActiveDeliveryId(newOrderId);
        setActiveDestination(currentRequest.restaurantCoordinate);
        setActiveMarkerImage(currentRequest.restaurantLogo);

        // loadRoute is triggered automatically by the activeDestination effect above,
        // but we call it explicitly here too so it fires immediately with current GPS.
        if (userLocation) {
          loadRoute(userLocation, currentRequest.restaurantCoordinate);
        }

        setAcceptedOrders((orders) =>
          orders.map((order) =>
            order.id === newOrderId
              ? {
                  ...order,
                  actionType: "deliver",
                  onDeliver: async () => {
                    try {
                      await updateOrderStatusWithGps(newOrderId, "delivered");
                    } catch (e) {
                      const msg = (e as ApiError)?.message ?? "Delivered update failed";
                      console.warn("Delivered update failed:", msg);
                      Alert.alert(t("delivery.deliverFailed", "Cannot mark delivered"), msg);
                      // Don't clear state — rider needs to get closer and retry.
                      return;
                    }
                    // Clear active delivery state
                    setAcceptedOrders((items) =>
                      items.filter((item) => item.id !== newOrderId),
                    );
                    setActiveDeliveryId(null);
                    setActiveDestination(null);
                    setActiveMarkerImage(null);
                    setRouteCoordinates([]);
                    setRouteInfo(null);
                  },
                }
              : order,
          ),
        );
      },

      onCancel: () => {
        setAcceptedOrders((orders) =>
          orders.filter((order) => order.id !== newOrderId),
        );
        if (activeDeliveryId === newOrderId) {
          setActiveDeliveryId(null);
          setActiveDestination(null);
          setActiveMarkerImage(null);
          setRouteCoordinates([]);
          setRouteInfo(null);
        }
      },
    };

    setAcceptedOrders((prev) => [accepted, ...prev]);
    clearNewOrder();
  };

  const handleDecline = async () => {
    if (!newOrder) return;
    const orderId = newOrder.orderId;
    clearNewOrder();
    try {
      await ordersApi.reject(orderId, { reason: "too_far" });
    } catch (err) {
      console.warn("Decline failed:", (err as ApiError)?.message);
    }
  };

  const handleTimerEnd = async () => {
    if (!newOrder) return;
    const orderId = newOrder.orderId;
    clearNewOrder();
    try {
      await ordersApi.reject(orderId, { reason: "timeout" });
    } catch (err) {
      console.warn("Auto-decline failed:", (err as ApiError)?.message);
    }
  };

  const handleStatusToggle = useCallback(async () => {
    if (statusBusy || !driver) return;
    setStatusBusy(true);
    try {
      await updateStatus(!driver.isOnline);
    } catch (err) {
      console.warn("Status toggle failed:", (err as ApiError)?.message);
    } finally {
      setStatusBusy(false);
    }
  }, [statusBusy, driver, updateStatus]);

  // ─── Socket cancellation → drop from accepted list ───────────────────────
  useEffect(() => {
    if (!cancelledOrder) return;
    const orderId = cancelledOrder.orderId;
    setAcceptedOrders((orders) => orders.filter((o) => o.id !== orderId));
    if (activeDeliveryId === orderId) {
      setActiveDeliveryId(null);
      setActiveDestination(null);
      setActiveMarkerImage(null);
      setRouteCoordinates([]);
      setRouteInfo(null);
    }
    clearCancelledOrder();
  }, [cancelledOrder, clearCancelledOrder, activeDeliveryId]);

  // ─── Wallet summary (today's earnings) ───────────────────────────────────
  useEffect(() => {
    if (!driver?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    walletApi
      .summary({ startDate: today, endDate: today })
      .then((s) => setTodayEarnings(formatNumber(s?.summary?.totalEarnings)))
      .catch(() => undefined);
  }, [driver?.id]);

  // ─── Zoom Handlers ────────────────────────────────────────────────────────
  const handleZoomIn = () => {
    if (!currentRegion) return;
    const newRegion = {
      ...currentRegion,
      latitudeDelta: currentRegion.latitudeDelta / 2,
      longitudeDelta: currentRegion.longitudeDelta / 2,
    };
    mapRef.current?.animateToRegion(newRegion, 300);
  };

  const handleZoomOut = () => {
    if (!currentRegion) return;
    const newRegion = {
      ...currentRegion,
      latitudeDelta: currentRegion.latitudeDelta * 2,
      longitudeDelta: currentRegion.longitudeDelta * 2,
    };
    mapRef.current?.animateToRegion(newRegion, 300);
  };

  // ─── Geocoding ────────────────────────────────────────────────────────────
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      if (result.length > 0) {
        const r = result[0];
        const name = r.city ?? r.district ?? r.subregion ?? "Unknown";
        const address = [r.street, r.name, r.district]
          .filter(Boolean)
          .join(", ");
        setSelected({
          name,
          address: address || r.formattedAddress || "",
          latitude: lat,
          longitude: lng,
        });
      }
    } catch {
      setSelected((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    }
  };

  const handleRegionChangeComplete = async (r: Region) => {
    setCurrentRegion(r);
    await reverseGeocode(r.latitude, r.longitude);
  };

  // ─── "Go to my location" button ──────────────────────────────────────────
  const goToCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coord: Coordinate = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      setUserLocation(coord);
      setGpsReady(true);

      mapRef.current?.animateToRegion(
        { ...coord, latitudeDelta: 0.008, longitudeDelta: 0.008 },
        600,
      );

      await reverseGeocode(coord.latitude, coord.longitude);

      // Re-draw route from updated position if there's an active destination
      if (activeDestination) {
        await loadRoute(coord, activeDestination);
      }
    } catch (e) {
      console.warn(e);
    }
    setLocating(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.root} edges={{}}>
        {/* ── Map Container ── */}
        <View style={styles.mapContainer}>
          {/* ── Header ── */}
          <View
            style={[
              styles.header,
              { flexDirection: rtl ? "row-reverse" : "row" },
            ]}
          >
            <DriverStatusHeader
              name={driverDisplayName}
              avatar={driver?.avatar ?? undefined}
              earnings={todayEarnings}
              isOnline={driver?.isOnline ?? false}
              onToggleStatus={handleStatusToggle}
            />
          </View>

          {/* ── GPS acquiring indicator (before first fix) ── */}
          {!gpsReady && (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#7900F3" />
                <Text style={styles.loadingText}>
                  {t("onmap.acquiringLocation", "Acquiring location…")}
                </Text>
              </View>
            </View>
          )}

          {/* ── Route calculation indicator ── */}
          {gpsReady && loadingRoute && (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#7900F3" />
                <Text style={styles.loadingText}>
                  {t("onmap.calculateRoute")}
                </Text>
              </View>
            </View>
          )}

          {/* ── Map ── Only render once we have the rider's real GPS fix, so the
              map opens centered on the rider instead of a hardcoded city. */}
          {gpsReady && userLocation && (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{ ...userLocation, ...DEFAULT_DELTA }}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation={false}
            showsMyLocationButton={false}
          >
            {/* Route Shadow — only when we have a real route */}
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="rgba(121, 0, 243, 0.15)"
                strokeWidth={12}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* Route Line */}
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#B894FF"
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* Destination Marker — only when an active destination exists */}
            {activeDestination && (
              <Marker
                coordinate={activeDestination}
                anchor={{ x: 0.5, y: 1 }}
                centerOffset={{ x: 0, y: -scale(12) }}
                zIndex={10}
              >
                <View style={styles.destinationMarker}>
                  <View style={styles.destinationMarkerInner}>
                    <Image
                      source={storeSource(activeMarkerImage)}
                      style={styles.markerAvatar}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.markerPointer} />
                </View>
              </Marker>
            )}

            {/* Rider Marker — only when GPS has a real fix */}
            {userLocation && (
              <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
                <Image
                  source={RIDER_IMAGE}
                  style={{ width: 80, height: 80 }}
                  resizeMode="contain"
                />
              </Marker>
            )}
          </MapView>
          )}

          {/* ── Zoom + Location Buttons ── */}
          <View
            style={[
              styles.floatingButtons,
              rtl ? { left: spacing.lg } : { right: spacing.lg },
              { bottom: sheetHeight + verticalScale(80) },
            ]}
          >
            {/* Location Button */}
            <TouchableOpacity
              style={styles.locationBtn}
              onPress={goToCurrentLocation}
              activeOpacity={0.85}
            >
              {locating ? (
                <ActivityIndicator size="small" color="#7900F3" />
              ) : (
                <LocationDotIcon size={scale(22)} color="#7900F3" />
              )}
            </TouchableOpacity>

            {/* Zoom Buttons */}
            <View style={styles.zoomContainer}>
              <TouchableOpacity
                style={[
                  styles.zoomBtn,
                  { borderBottomColor: "#F3E2FF", borderBottomWidth: 0.5 },
                ]}
                onPress={handleZoomIn}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={scale(24)} color="#67537C" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.zoomBtn,
                  { borderTopColor: "#F3E2FF", borderTopWidth: 0.5 },
                ]}
                onPress={handleZoomOut}
                activeOpacity={0.8}
              >
                <Ionicons name="remove" size={scale(24)} color="#67537C" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Order Request Card — shown only when there is a pending order ── */}
        {currentRequest && routeInfo && !loadingRoute && (
          <OrderRequestCard
            key={currentRequest.id}
            visible={showOrder}
            bottomOffset={sheetHeight - verticalScale(40)}
            restaurantName={currentRequest.restaurantName}
            restaurantLocation={currentRequest.restaurantLocation}
            restaurantLogo={currentRequest.restaurantLogo}
            totalDistance={currentRequest.totalDistance}
            totalDuration={currentRequest.totalDuration}
            timerSeconds={currentRequest.expiresInSeconds}
            currency="IQD"
            isRTL={rtl}
            items={currentRequest.items}
            onAccept={handleAcceptOrder}
            onDecline={handleDecline}
            onTimerEnd={handleTimerEnd}
          />
        )}

        <AcceptedOrdersSheet orders={acceptedOrders} />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    position: "absolute",
    top: verticalScale(28),
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 999,
  },
  backBtn: {
    marginTop: scale(40),
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.card,
  },

  // Loading
  loadingContainer: {
    position: "absolute",
    top: verticalScale(160),
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 6,
  },
  loadingBox: {
    backgroundColor: Colors.background,
    borderRadius: scale(20),
    paddingVertical: scale(10),
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    ...Shadow.card,
  },
  loadingText: {
    fontSize: scale(13),
    color: Colors.textSecondary,
  },

  // Map
  mapContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: Colors.background,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  // Destination Marker
  destinationMarker: {
    alignItems: "center",
    marginBottom: 30,
  },
  destinationMarkerInner: {
    width: scale(54),
    height: scale(54),
    borderRadius: scale(27),
    backgroundColor: Colors.primary,
    padding: scale(2.5),
  },
  markerAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: scale(24),
  },
  markerPointer: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: scale(5),
    borderRightWidth: scale(5),
    borderTopWidth: scale(13),
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: Colors.primary,
    marginTop: -scale(1),
  },

  // Floating Buttons
  floatingButtons: {
    position: "absolute",
    alignItems: "center",
    gap: scale(10),
    zIndex: 10,
  },

  // Location Button
  locationBtn: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(29),
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.card,
  },

  // Zoom Buttons
  zoomContainer: {
    backgroundColor: Colors.background,
    borderRadius: radius.full,
    alignItems: "center",
    ...Shadow.card,
  },
  zoomBtn: {
    width: scale(50),
    height: scale(55),
    alignItems: "center",
    justifyContent: "center",
  },
});
