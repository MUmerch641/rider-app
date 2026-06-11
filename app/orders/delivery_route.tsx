import {
    ordersApi,
    type ApiError,
    type DriverNextStatus,
    type OrderAssignment,
} from "@/api";
import { DeliveryBottomSheet } from "@/components/ui";
import { LocationDotIcon } from "@/components/ui/icons/LocationDotIcon";
import { Colors, Shadow } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { localizeName, type LangKey } from "@/utils/localize";
import { avatarSource, storeSource } from "@/utils/placeholders";
import { radius, scale, spacing, verticalScale } from "@/utils/responsive";
import {
  fetchDirections,
  generateStraightLine,
  nearestPointOnPolyline,
  remainingRoute,
  REROUTE_CONSECUTIVE_TICKS,
  REROUTE_DEVIATION_METERS,
  REROUTE_MIN_INTERVAL_MS,
  type Coordinate,
} from "@/utils/routing";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import { useNavGuard } from "@/hooks/useNavGuard";
import { useDialog } from "@/components/ui/AppDialog";
import { CancelRequestModal } from "@/components/ui/CancelRequestModal";
import type { CancelRequestReason } from "@/api/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    I18nManager,
    Image,
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { translateOrderStatusError } from "@/utils/orderStatusErrors";
import { updateOrderStatusWithGps } from "@/utils/orderStatusGps";
import { openWhatsAppChat } from "@/utils/whatsapp";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
const RIDER_IMAGE = require("@/assets/images/driver/setPointRoute.png");

// Routing utilities (Directions fetch, polyline decode, straight-line fallback,
// trim + deviation helpers) are shared with the On-Map screen — see
// utils/routing.ts.

// Default zoom level. The map always centers on the order's pickup/dropoff
// (or the rider's real GPS) — never a hardcoded city. A previous version
// hardcoded Sulaymaniyah here, so every rider's map opened on the wrong city.
const DEFAULT_DELTA = {
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function DeliveryRoute() {
  const router = useNavGuard();
  const dialog = useDialog();
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const langKey: LangKey = (i18n.language as LangKey) || "en";
  const mapRef = useRef<MapView>(null);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["20%", "45%"], []);

  // ─── Route params ───────────────────────────────────────────────────────
  const params = useLocalSearchParams<{ id?: string; phase?: string }>();
  const orderId = typeof params.id === "string" ? params.id : "";
  const paramPhase: "pickup" | "dropoff" =
    params.phase === "dropoff" ? "dropoff" : "pickup";

  // ─── Assignment ─────────────────────────────────────────────────────────
  const [assignment, setAssignment] = useState<OrderAssignment | null>(null);
  const [arrivedBusy, setArrivedBusy] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Drivers can't self-cancel a live delivery — they REQUEST an admin to
  // cancel/reassign it. This posts the reason; the dashboard surfaces it and
  // an admin reassigns. The order stays with this driver until then.
  const handleRequestCancellation = async (
    reason: CancelRequestReason,
    note: string,
  ) => {
    if (!orderId || cancelSubmitting) return;
    setCancelSubmitting(true);
    try {
      await ordersApi.requestCancellation(orderId, {
        reason,
        note: note || undefined,
      });
      setCancelModalOpen(false);
      dialog.show({
        title: t("cancelRequest.sentTitle", "Request sent"),
        message: t(
          "cancelRequest.sentMessage",
          "Support has been notified and will reassign this order. You can keep delivering until then.",
        ),
        tone: "success",
      });
    } catch (err) {
      const msg = (err as ApiError)?.message ?? "Request failed";
      dialog.show({
        title: t("cancelRequest.failedTitle", "Couldn't send request"),
        message: msg,
        tone: "error",
      });
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Derive the phase from the order's ACTUAL status, not just the nav param.
  // Once the rider has picked up, this screen must show the dropoff action
  // (Arrived at customer) — never the pickup action — otherwise tapping it
  // would push the status backward to picked_up and loop the rider.
  const phase: "pickup" | "dropoff" = useMemo(() => {
    const s = assignment?.order?.status;
    if (!s) return paramPhase; // assignment still loading — trust the nav intent
    // Post-pickup statuses ⇒ the rider is heading to the customer.
    if (
      s === "picked_up" ||
      s === "on_the_way" ||
      s === "arrived" ||
      s === "delivered"
    )
      return "dropoff";
    // Everything earlier (…driver_assigned / driver_arrived at store) ⇒ pickup.
    return "pickup";
  }, [assignment?.order?.status, paramPhase]);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await ordersApi.getById(orderId);
        if (!cancelled) setAssignment(data);
      } catch (err) {
        console.warn("Fetch order failed:", (err as ApiError)?.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // Pickup destination = store coordinates; Dropoff destination = customer/delivery address.
  const destination = useMemo(() => {
    if (!assignment?.order) return null;
    if (phase === "pickup") {
      const g = assignment.order.store?.geoLocation;
      if (g?.lat == null || g?.lng == null) return null;
      return { latitude: g.lat, longitude: g.lng };
    }
    const g = assignment.order.deliveryAddress?.geoLocation;
    if (g?.lat == null || g?.lng == null) return null;
    return { latitude: g.lat, longitude: g.lng };
  }, [assignment, phase]);

  const sheetTitle = useMemo(() => {
    if (!assignment?.order) return "";
    if (phase === "pickup") {
      return localizeName(assignment.order.store?.name, langKey);
    }
    return assignment.order.customer?.name ?? "";
  }, [assignment, phase, langKey]);

  const sheetSubtitle = useMemo(() => {
    if (!assignment?.order) return "";
    if (phase === "pickup") {
      return assignment.order.store?.address ?? "";
    }
    const da = assignment.order.deliveryAddress;
    if (!da) return "";
    const parts = [da.building, da.street].filter(Boolean) as string[];
    return parts.join(", ");
  }, [assignment, phase]);

  const markerSource =
    phase === "pickup"
      ? storeSource(assignment?.order?.store?.avatar)
      : avatarSource(assignment?.order?.customer?.avatar);

  const callPhone =
    phase === "pickup"
      ? (assignment?.order?.store?.phone ?? "")
      : (assignment?.order?.customer?.phone ?? "");

  const [sheetHeight, setSheetHeight] = useState(verticalScale(160));

  const handleSheetChange = (index: number) => {
    if (index === 0) {
      setSheetHeight(verticalScale(160));
    } else {
      setSheetHeight(verticalScale(350));
    }
  };
  const [locating, setLocating] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  // Full route as fetched. `trimmedRoute` is the live remainder of it (the line
  // shrinks behind the rider); rendering uses trimmedRoute ?? routeCoordinates.
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [trimmedRoute, setTrimmedRoute] = useState<Coordinate[] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
  } | null>(null);
  const [routeError, setRouteError] = useState(false);
  // Chase-cam: follow the rider on every GPS tick until the user pans away.
  const [isFollowing, setIsFollowing] = useState(true);

  // Refs mirrored from state — GPS ticks read/write these so a tick can never
  // re-trigger the fetch effects (which are keyed to the destination only).
  const userLocationRef = useRef<Coordinate | null>(null);
  const destinationRef = useRef<Coordinate | null>(null);
  const routeRef = useRef<Coordinate[]>([]);
  const loadingRouteRef = useRef(false);
  const lastRouteFetchAtRef = useRef(0);
  const offRouteTicksRef = useRef(0);
  const isFollowingRef = useRef(true);

  useEffect(() => {
    destinationRef.current = destination;
  }, [destination]);
  useEffect(() => {
    isFollowingRef.current = isFollowing;
  }, [isFollowing]);

  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);

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
  // Fetch directions. Deps are EMPTY on purpose: route fetching is driven by
  // destination changes and the deviation logic in handleLocationTick — never
  // by GPS ticks re-creating this callback.
  const loadRoute = useCallback(async (origin: Coordinate, dest: Coordinate) => {
    loadingRouteRef.current = true;
    setLoadingRoute(true);
    setRouteError(false);
    offRouteTicksRef.current = 0;

    try {
      const result = await fetchDirections(origin, dest);

      if (result) {
        routeRef.current = result.coordinates;
        setRouteCoordinates(result.coordinates);
        setRouteInfo({
          distance: result.distance,
          duration: result.duration,
        });
      } else {
        routeRef.current = generateStraightLine(origin, dest);
        setRouteCoordinates(routeRef.current);
        setRouteInfo(null);
        setRouteError(true);
      }
    } catch {
      routeRef.current = generateStraightLine(origin, dest);
      setRouteCoordinates(routeRef.current);
      setRouteInfo(null);
      setRouteError(true);
    }

    setTrimmedRoute(null);
    lastRouteFetchAtRef.current = Date.now();
    loadingRouteRef.current = false;
    setLoadingRoute(false);
  }, []);

  // Route load — keyed to the DESTINATION only. userLocation changes never
  // refetch by themselves. If GPS isn't ready yet when the destination resolves,
  // the first watcher tick below fires the initial fetch instead. Never draw a
  // route from a placeholder origin (that's how the route used to start in
  // Sulaymaniyah).
  useEffect(() => {
    if (!destination) return;
    const origin = userLocationRef.current;
    if (!origin) return;
    void loadRoute(origin, destination);
  }, [destination, loadRoute]);

  // One GPS tick: update the marker + chase-cam, then maintain the route
  // WITHOUT refetching — trim the line behind the rider, and only re-route
  // after a sustained deviation (shared REROUTE_* thresholds in utils/routing).
  const handleLocationTick = useCallback(
    (coord: Coordinate) => {
      userLocationRef.current = coord;
      setUserLocation(coord);

      if (isFollowingRef.current) {
        // Keep the rider centered at the user's current zoom level.
        mapRef.current?.animateCamera({ center: coord }, { duration: 750 });
      }

      const dest = destinationRef.current;
      if (!dest || loadingRouteRef.current) return;

      const route = routeRef.current;
      if (route.length === 0) {
        // Destination resolved before the first GPS fix — fetch now.
        void loadRoute(coord, dest);
        return;
      }

      const { distanceMeters } = nearestPointOnPolyline(coord, route);
      if (distanceMeters > REROUTE_DEVIATION_METERS) {
        offRouteTicksRef.current += 1;
        if (
          offRouteTicksRef.current >= REROUTE_CONSECUTIVE_TICKS &&
          Date.now() - lastRouteFetchAtRef.current > REROUTE_MIN_INTERVAL_MS
        ) {
          void loadRoute(coord, dest);
          return;
        }
      } else {
        offRouteTicksRef.current = 0;
      }

      // Shrink the rendered line behind the rider.
      setTrimmedRoute(remainingRoute(coord, route));
    },
    [loadRoute],
  );

  // Display-only GPS watcher while the screen is mounted. It NEVER calls the
  // location API — the app-wide tracker (utils/locationTracking) owns the
  // single transmission path.
  useEffect(() => {
    let cancelled = false;
    let watcher: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;
      watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (loc) => {
          if (cancelled) return;
          handleLocationTick({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        },
      );
    })();
    return () => {
      cancelled = true;
      watcher?.remove();
    };
  }, [handleLocationTick]);

  // Fit map to show the entire route — but only when the user has panned away
  // from chase-cam; in follow mode the camera stays glued to the rider.
  useEffect(() => {
    if (routeCoordinates.length === 0 || isFollowingRef.current) return;
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
  }, [routeCoordinates]);

  // A gesture-driven region change means the rider panned the map — drop out
  // of chase-cam until they tap the locate button again.
  const stopFollowing = () => {
    if (!isFollowingRef.current) return;
    isFollowingRef.current = false;
    setIsFollowing(false);
  };

  // NOTE: no reverse geocoding here. The chase-cam animates the camera on every
  // GPS tick, and each programmatic animation fires this callback — a geocoder
  // call per tick would hammer CLGeocoder/Android's geocoder for data nothing
  // on this screen renders. currentRegion only feeds the zoom buttons.
  const handleRegionChangeComplete = (
    r: Region,
    details?: { isGesture?: boolean },
  ) => {
    if (details?.isGesture) stopFollowing();
    setCurrentRegion(r);
  };

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

      const newLocation: Coordinate = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      userLocationRef.current = newLocation;
      setUserLocation(newLocation);
      // Re-engage chase-cam.
      isFollowingRef.current = true;
      setIsFollowing(true);

      const newRegion: Region = {
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      };

      mapRef.current?.animateToRegion(newRegion, 600);
      // NOTE: no loadRoute here — fetches are driven by destination changes and
      // the deviation logic in handleLocationTick. The old locate-tap refetch
      // doubled up with the destination effect.
    } catch (e) {
      console.warn(e);
    }
    setLocating(false);
  };

  // Auto-center on the rider's real GPS as soon as the screen opens, so the map
  // and route origin use the actual location. Previously userLocation stayed null
  // until the rider tapped the locate button, so the map opened on a hardcoded
  // city (Sulaymaniyah) and the route was drawn from there.
  useEffect(() => {
    void goToCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The map's initial center: the order's pickup/dropoff if known, else the
  // rider's GPS. Never a hardcoded city — the map only renders once one of these
  // real anchors is available (see render below).
  const initialMapRegion = useMemo<Region | null>(() => {
    const anchor = destination ?? userLocation;
    if (!anchor) return null;
    return { ...anchor, ...DEFAULT_DELTA };
  }, [destination, userLocation]);

  // The polyline actually rendered: the live remainder once we have GPS ticks,
  // else the full fetched route.
  const displayedRoute = trimmedRoute ?? routeCoordinates;

  const handleCall = async () => {
    if (!callPhone) return; // button is disabled, but guard anyway
    if (phase === "pickup") {
      // Store contact stays a plain phone call — WhatsApp routing only
      // applies to customer ↔ rider contact.
      Linking.openURL(`tel:${callPhone}`).catch(() => undefined);
      return;
    }
    // Customer contact opens a WhatsApp chat (WhatsApp can't deep-link a
    // voice call) prefilled with the order number so the customer has
    // context; the rider can start a WhatsApp call from inside the chat.
    const opened = await openWhatsAppChat(
      callPhone,
      t("delivery.whatsappOrderMessage", {
        orderNumber: assignment?.order?.orderNumber ?? "",
      }),
    );
    if (!opened) {
      dialog.show({
        title: t("delivery.whatsappUnavailableTitle"),
        message: t("delivery.whatsappUnavailableMsg"),
        tone: "error",
      });
    }
  };

  const handleArrived = async () => {
    if (!orderId || arrivedBusy) return;
    const next: DriverNextStatus =
      phase === "pickup" ? "picked_up" : "arrived";
    setArrivedBusy(true);
    try {
      await updateOrderStatusWithGps(orderId, next);
      router.back();
    } catch (err) {
      // GPS_REQUIRED / OUT_OF_RANGE come back as backend codes — translate
      // them; unknown errors fall back to the raw message.
      const msg = translateOrderStatusError(err);
      console.warn("Arrived update failed:", msg);
      dialog.show({
        // Pickup-phase button now reads "Picked Up", so "Cannot mark arrived"
        // would mismatch the action the rider tapped.
        title:
          phase === "pickup"
            ? t("delivery.statusFailed", "Cannot update status")
            : t("delivery.arrivedFailed", "Cannot mark arrived"),
        message: msg,
        tone: "error",
      });
    } finally {
      setArrivedBusy(false);
    }
  };

  // The standalone active-delivery screen was removed (navigation lives on
  // this screen); "order details" now lands on the Orders tab summary.
  const handleOrderDetails = () => {
    router.push("/orders");
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.root} edges={{}}>
        {/* ── Map Container ── */}
        <View style={styles.mapContainer}>
          {/* ── Header — native RTL mirrors the row automatically ── */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons
                // Icon glyphs never auto-flip — mirror the back arrow manually.
                name={I18nManager.isRTL ? "arrow-forward" : "arrow-back"}
                size={scale(22)}
                color={Colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          {/* ── Loading Indicator ── */}
          {loadingRoute && (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#7900F3" />
                <Text style={styles.loadingText}>
                  {t("onmap.calculateRoute")}
                </Text>
              </View>
            </View>
          )}

          {/* ── Route ETA banner — distance + duration, with a warning badge
              when we're showing the straight-line fallback ── */}
          {!loadingRoute && (routeInfo || routeError) && (
            <View style={styles.routeInfoBanner}>
              {routeInfo && (
                <>
                  <View style={styles.routeInfoItem}>
                    <Ionicons
                      name="navigate-outline"
                      size={scale(16)}
                      color={Colors.primary}
                    />
                    <Text
                      style={[
                        styles.routeInfoText,
                        { fontFamily: font.semibold },
                      ]}
                    >
                      {routeInfo.distance}
                    </Text>
                  </View>
                  <View style={styles.routeInfoDivider} />
                  <View style={styles.routeInfoItem}>
                    <Ionicons
                      name="time-outline"
                      size={scale(16)}
                      color={Colors.primary}
                    />
                    <Text
                      style={[
                        styles.routeInfoText,
                        { fontFamily: font.semibold },
                      ]}
                    >
                      {routeInfo.duration}
                    </Text>
                  </View>
                </>
              )}
              {routeError && (
                <>
                  <View style={styles.routeInfoItem}>
                    <Ionicons
                      name="warning-outline"
                      size={scale(16)}
                      color="#F59E0B"
                    />
                    <Text
                      style={[
                        styles.routeInfoText,
                        { fontFamily: font.medium },
                      ]}
                    >
                      {t("delivery.approximateRoute")}
                    </Text>
                  </View>
                  <View style={styles.routeErrorBadge}>
                    <Ionicons
                      name="alert-circle"
                      size={scale(18)}
                      color="#F59E0B"
                    />
                  </View>
                </>
              )}
            </View>
          )}

          {/* ── Map ── */}
          {!initialMapRegion ? (
            <View
              style={[
                styles.map,
                { alignItems: "center", justifyContent: "center" },
              ]}
            >
              <ActivityIndicator size="large" color="#7900F3" />
            </View>
          ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialMapRegion}
            onRegionChangeComplete={handleRegionChangeComplete}
            onPanDrag={stopFollowing}
            showsUserLocation={false}
            showsMyLocationButton={false}
          >
            {displayedRoute.length > 0 && (
              <Polyline
                coordinates={displayedRoute}
                strokeColor="rgba(121, 0, 243, 0.15)"
                strokeWidth={12}
                lineCap="round"
                lineJoin="round"
              />
            )}
            {displayedRoute.length > 0 && (
              <Polyline
                coordinates={displayedRoute}
                strokeColor="#B894FF"
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
              />
            )}
            {destination && (
              <Marker
                coordinate={destination}
                anchor={{ x: 0.5, y: 1 }}
                centerOffset={{ x: 0, y: -scale(12) }}
                zIndex={10}
              >
                <View style={styles.destinationMarker}>
                  <View style={styles.destinationMarkerInner}>
                    <Image
                      source={markerSource}
                      style={styles.markerAvatar}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.markerPointer} />
                </View>
              </Marker>
            )}
            {userLocation && (
              <Marker
                coordinate={userLocation}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <Image
                  source={RIDER_IMAGE}
                  style={{ width: 80, height: 80 }}
                  resizeMode="contain"
                />
              </Marker>
            )}
          </MapView>
          )}
        </View>

        {/* ── Zoom + Location Buttons — native RTL swaps the absolute
            right offset automatically ── */}
        <View
          style={[
            styles.floatingButtons,
            { bottom: sheetHeight + verticalScale(80) }, // ← moves with sheet
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
        {/* ── Draggable Bottom Sheet ── */}
        <BottomSheet
          ref={bottomSheetRef}
          index={1}
          snapPoints={snapPoints}
          enablePanDownToClose={false}
          handleIndicatorStyle={styles.sheetIndicator}
          backgroundStyle={styles.sheetBackground}
          onChange={handleSheetChange}
        >
          <BottomSheetView style={styles.sheetContent}>
            <DeliveryBottomSheet
              restaurantName={sheetTitle}
              restaurantLocation={sheetSubtitle}
              primaryActionLabel={
                phase === "pickup"
                  ? t("delivery.pickedUp")
                  : t("delivery.arrivedAtCustomer")
              }
              activeTab="navigate"
              onCall={handleCall}
              // No phone yet (legacy orders served by a backend without the
              // customer block, or payload still loading) — dim + disable.
              callDisabled={!callPhone}
              onArrived={handleArrived}
              onCancelDelivery={() => setCancelModalOpen(true)}
              onNavigate={() => {}}
              onOrderDetails={handleOrderDetails}
              onSupport={() => {
                router.push("/inbox/support_chat");
              }}
            />
          </BottomSheetView>
        </BottomSheet>

        <CancelRequestModal
          visible={cancelModalOpen}
          submitting={cancelSubmitting}
          onSubmit={handleRequestCancellation}
          onClose={() => setCancelModalOpen(false)}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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

  // Route Info Banner
  routeInfoBanner: {
    position: "absolute",
    top: verticalScale(110),
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: Colors.background,
    borderRadius: scale(16),
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.card,
    zIndex: 5,
  },
  routeInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
  },
  routeInfoText: {
    fontSize: scale(14),
    color: Colors.textPrimary,
  },
  routeInfoDivider: {
    width: scale(1),
    height: scale(20),
    backgroundColor: Colors.border,
    marginHorizontal: spacing.md,
  },
  routeErrorBadge: {
    position: "absolute",
    top: -scale(4),
    right: -scale(4),
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

  // Destination Marker (Restaurant Avatar)
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

  // Current Location Button
  locationBtn: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(29),
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  locationBtnLTR: { right: spacing.lg },
  locationBtnRTL: { left: spacing.lg },
  sheetBackground: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
  },
  sheetIndicator: {
    backgroundColor: Colors.border,
    width: scale(40),
  },
  sheetContent: {
    flex: 1,
  },
  // Zoom Buttons
  floatingButtons: {
    position: "absolute",
    right: spacing.lg,
    alignItems: "center",
    gap: scale(10),
    zIndex: 10,
  },
  zoomContainer: {
    backgroundColor: Colors.background,
    borderRadius: radius.full,
    alignItems: "center",
    marginBottom: scale(40),
  },
  zoomBtn: {
    width: scale(50),
    height: scale(55),
    alignItems: "center",
    justifyContent: "center",
  },
});
