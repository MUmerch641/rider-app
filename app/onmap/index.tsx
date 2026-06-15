import { ordersApi, type ApiError, type OrderAssignment } from "@/api";
import { AcceptedOrdersSheet } from "@/components/ui/AcceptedOrdersSheet";
import { LocationDotIcon } from "@/components/ui/icons/LocationDotIcon";
import OrderRequestCard from "@/components/ui/OrderRequestCard";
import PrepCountdownRing from "@/components/ui/PrepCountdownRing";
import { Colors, Shadow } from "@/constants/theme";
import { useAuth, useSocket } from "@/context";
import { formatDistanceKm, formatDurationMinutes } from "@/utils/format";
import { localizeName, type LangKey } from "@/utils/localize";
import {
  ACTIVE_STATUSES,
  nextStatus,
  POST_PICKUP_STATUSES,
} from "@/utils/orderLifecycle";
import { translateOrderStatusError } from "@/utils/orderStatusErrors";
import { updateOrderStatusWithGps } from "@/utils/orderStatusGps";
import { storeSource } from "@/utils/placeholders";
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
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { useNavGuard } from "@/hooks/useNavGuard";
import { useDialog } from "@/components/ui/AppDialog";
import { t } from "i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

const RIDER_IMAGE = require("@/assets/images/driver/setPointRoute.png");

// NOTE: this screen deliberately has NO online/offline toggle and no driver
// header — availability is toggled from the Orders tab header (OpenStatusToggle
// wired to AuthContext.updateStatus). The map is a pure delivery surface.

// Turn-by-turn NAVIGATION (chase-cam, deviation reroute, GPS-gated CTAs) lives
// in /orders/delivery_route — tapping an accepted-order card navigates there.
// This map only PREVIEWS direction: a route polyline from the rider to the
// offer's store (plus a lighter store→customer leg) while an offer is showing,
// or to the first active assignment's current target otherwise, alongside one
// marker per accepted order at its target.

// Default zoom level. The map centers on the rider's real GPS (see the on-mount
// GPS effect) — never a hardcoded city. The map is not rendered until the first
// GPS fix arrives, so there is no placeholder region to leak.
const DEFAULT_DELTA = {
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Current map target of an assignment: the store until pickup, the customer's
// delivery address afterwards.
function assignmentTarget(a: OrderAssignment): Coordinate | null {
  const geo = POST_PICKUP_STATUSES.has(a.status)
    ? a.order?.deliveryAddress?.geoLocation
    : a.order?.store?.geoLocation;
  if (geo?.lat == null || geo?.lng == null) return null;
  return { latitude: geo.lat, longitude: geo.lng };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function OnMap() {
  const router = useNavGuard();
  const dialog = useDialog();
  const { i18n } = useTranslation();
  const mapRef = useRef<MapView>(null);

  // ─── State ──────────────────────────────────────────────────────────────
  // Server-truth assignments (GET /driver/orders) — replaces the old local
  // closure-built acceptedOrders list.
  const [assignments, setAssignments] = useState<OrderAssignment[]>([]);
  // Per-order busy flags while a status-advance request is in flight.
  const [advancing, setAdvancing] = useState<Record<string, boolean>>({});
  const [sheetHeight] = useState(verticalScale(160));
  const [locating, setLocating] = useState(false);
  const [gpsReady, setGpsReady] = useState(false); // true once first fix arrives
  // Bumped on every screen focus. Drives the AcceptedOrdersSheet to re-expand
  // when the rider returns from the delivery-route screen so the accepted-order
  // list is reliably visible again (it previously only reappeared after a full
  // tab switch because the sheet kept its collapsed state across the blur).
  const [focusTick, setFocusTick] = useState(0);

  // Live driver position — null until GPS provides a real fix
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const userLocationRef = useRef<Coordinate | null>(null);

  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);

  // Per-order busy flags while an accept/decline request for a NEARBY offer is
  // in flight (mirrors the old Orders-tab "acting" map).
  const [acting, setActing] = useState<Record<string, boolean>>({});

  // ─── Live data hooks ─────────────────────────────────────────────────────
  const { driver } = useAuth();
  const {
    newOrder,
    cancelledOrder,
    clearNewOrder,
    clearCancelledOrder,
    stopAlarm,
  } = useSocket();

  const langKey: LangKey = (i18n.language as LangKey) || "en";

  // ─── Server-truth order list ──────────────────────────────────────────────
  const refreshAssignments = useCallback(async () => {
    try {
      const list = await ordersApi.list();
      setAssignments(list);
    } catch (err) {
      console.warn("Fetch orders failed:", (err as ApiError)?.message);
    }
  }, []);

  // Refetch on mount + every focus so deliveries advanced on other screens
  // (active delivery / route) surface here immediately. The focusTick bump
  // re-expands the accepted-orders sheet on return (see AcceptedOrdersSheet
  // expandSignal) — the screen stays mounted under the pushed route, so its
  // collapsed state would otherwise persist and hide the list.
  useFocusEffect(
    useCallback(() => {
      void refreshAssignments();
      setFocusTick((n) => n + 1);
    }, [refreshAssignments]),
  );

  // Refetch when a new dispatch offer arrives — the assignment row exists
  // server-side before the rider even answers the offer.
  useEffect(() => {
    if (!newOrder) return;
    void refreshAssignments();
  }, [newOrder, refreshAssignments]);

  // Socket cancellation → refetch (replaces the old local splice).
  useEffect(() => {
    if (!cancelledOrder) return;
    void refreshAssignments();
    clearCancelledOrder();
  }, [cancelledOrder, clearCancelledOrder, refreshAssignments]);

  // Sheet items = in-progress deliveries only (shared ACTIVE_STATUSES set).
  const sheetOrders = useMemo(
    () => assignments.filter((a) => ACTIVE_STATUSES.has(a.status)),
    [assignments],
  );

  // New-orders-nearby = offered-but-unaccepted assignments (status "assigned"),
  // EXCLUDING the one already shown as the live offer card at the top
  // (currentRequest, from the socket newOrder). Without this exclusion the same
  // order rendered twice — once in the top offer card and once here — giving
  // two Accept/Decline pairs for one order. The top card is canonical for the
  // live offer; this list shows only OTHER pending offers (and still surfaces
  // an "assigned" order on its own after the socket offer has cleared, e.g. on
  // app reopen).
  const nearbyOrders = useMemo(
    () =>
      assignments.filter(
        (a) => a.status === "assigned" && a.orderId !== newOrder?.orderId,
      ),
    [assignments, newOrder],
  );

  // ─── Map socket newOrder → component-shape currentRequest ────────────────
  const currentRequest = useMemo(() => {
    if (!newOrder) return null;

    return {
      id: newOrder.orderId,
      restaurantName: localizeName(newOrder.store?.name, langKey),
      restaurantLocation: newOrder.store?.address ?? "",
      restaurantLogo: newOrder.store?.logoUrl ?? "",
      totalDistance: formatDistanceKm(newOrder.distanceKm),
      totalDuration: formatDurationMinutes(newOrder.estimatedMinutes),
      items: (newOrder.items ?? []).map((it) => ({
        id: it.id,
        quantity: it.quantity,
        name: localizeName(it.name, langKey),
        price: typeof it.price === "string" ? Number(it.price) : it.price,
      })),
      expiresInSeconds: newOrder.expiresInSeconds ?? 30,
    };
  }, [newOrder, langKey]);

  // ─── Route preview polylines ──────────────────────────────────────────────
  // Two modes:
  //   1. Offer preview (currentRequest visible): rider→store is the primary
  //      route, plus a lighter dashed store→customer leg so the rider can
  //      judge the FULL trip before accepting.
  //   2. Accepted orders: rider→first active assignment's current target
  //      (assignmentTarget — store before pickup, customer after).
  // No offer and no orders ⇒ no polylines. The Directions API is hit only when
  // the destination changes or after a sustained deviation — GPS ticks merely
  // TRIM the displayed line via remainingRoute().
  const [primaryRoute, setPrimaryRoute] = useState<Coordinate[]>([]);
  const [trimmedRoute, setTrimmedRoute] = useState<Coordinate[] | null>(null);
  // Offer-only secondary leg (store→customer).
  const [previewLeg, setPreviewLeg] = useState<Coordinate[]>([]);

  // Refs mirrored from state — GPS ticks read/write these so a tick can never
  // re-trigger the fetch effects (which are keyed to the destination only).
  const routeRef = useRef<Coordinate[]>([]);
  const routeDestinationRef = useRef<Coordinate | null>(null);
  const loadingRouteRef = useRef(false);
  // Monotonic fetch id — only the LATEST-issued loadRoute may commit. Bumped on
  // every loadRoute call and when the destination clears, so an in-flight
  // Directions response for a gone offer/order can never repaint the polyline.
  const fetchSeqRef = useRef(0);
  const lastRouteFetchAtRef = useRef(0);
  const offRouteTicksRef = useRef(0);
  const offerVisibleRef = useRef(false);

  // Offer endpoints from the socket payload ({lat,lng} → map Coordinate).
  const offerStore = useMemo<Coordinate | null>(() => {
    const loc = newOrder?.store?.location;
    if (loc?.lat == null || loc?.lng == null) return null;
    return { latitude: loc.lat, longitude: loc.lng };
  }, [newOrder]);

  const offerCustomer = useMemo<Coordinate | null>(() => {
    const loc = newOrder?.customer?.location;
    if (loc?.lat == null || loc?.lng == null) return null;
    return { latitude: loc.lat, longitude: loc.lng };
  }, [newOrder]);

  const firstTarget = useMemo<Coordinate | null>(() => {
    const first = sheetOrders[0];
    return first ? assignmentTarget(first) : null;
  }, [sheetOrders]);

  // Active-order info overlay data: distance (km) + ETA from the assignment's
  // own routing fields, and the merchant prep deadline (estimatedReadyAt) for
  // the countdown ring. Driven by the first active assignment; the overlay is
  // hidden whenever an offer card is on screen (currentRequest) to avoid
  // stacking two cards over the map.
  const activeOrder = sheetOrders[0] ?? null;
  const activeInfo = useMemo(() => {
    if (!activeOrder) return null;
    const distance = formatDistanceKm(activeOrder.distanceKm);
    const eta = formatDurationMinutes(activeOrder.estimatedMinutes);
    const readyAt = activeOrder.order?.estimatedReadyAt ?? null;
    if (!distance && !eta && !readyAt) return null;
    return { distance, eta, readyAt };
  }, [activeOrder]);

  // Primary destination: the offer's store while an offer is showing, else the
  // first active target. The primitive key matters: assignment refetches
  // rebuild the target object with the SAME coordinates, and keying the fetch
  // effect on this string stops those identity churns from re-hitting the
  // Directions API.
  const routeDestination = offerStore ?? firstTarget;
  const routeDestKey = routeDestination
    ? `${routeDestination.latitude},${routeDestination.longitude}`
    : null;

  // Ref syncs — declared BEFORE the fetch effect below so the refs are current
  // when it runs (effects fire in declaration order).
  useEffect(() => {
    routeDestinationRef.current = routeDestination;
  }, [routeDestination]);
  useEffect(() => {
    offerVisibleRef.current = !!newOrder;
  }, [newOrder]);

  // Fetch directions. Deps are EMPTY on purpose: route fetching is driven by
  // destination changes and the deviation logic in handleLocationTick — never
  // by GPS ticks re-creating this callback.
  const loadRoute = useCallback(async (origin: Coordinate, dest: Coordinate) => {
    const seq = ++fetchSeqRef.current;
    loadingRouteRef.current = true;
    offRouteTicksRef.current = 0;
    let coords: Coordinate[];
    try {
      const result = await fetchDirections(origin, dest);
      // A degenerate (<2 point) polyline is treated as a failure so routeRef
      // can never stay empty after a load — otherwise the tick handler's
      // route.length === 0 branch would refetch on every GPS tick.
      coords =
        result && result.coordinates.length >= 2
          ? result.coordinates
          : generateStraightLine(origin, dest);
    } catch {
      coords = generateStraightLine(origin, dest);
    }
    // Stale guard: bail if a newer fetch was issued (or the destination
    // cleared) while this one was in flight — the newer owner commits state
    // and clears loadingRouteRef.
    if (seq !== fetchSeqRef.current) return;
    loadingRouteRef.current = false;
    const current = routeDestinationRef.current;
    if (
      !current ||
      current.latitude !== dest.latitude ||
      current.longitude !== dest.longitude
    ) {
      return;
    }
    routeRef.current = coords;
    setPrimaryRoute(coords);
    setTrimmedRoute(null);
    lastRouteFetchAtRef.current = Date.now();
  }, []);

  // Route load — keyed to the DESTINATION only (a key change = status flip,
  // different first order, or an offer appearing/clearing). GPS ticks never
  // land here. If GPS isn't ready yet, the first tick fires the initial fetch.
  useEffect(() => {
    if (!routeDestKey) {
      // Invalidate any in-flight fetch so it can't resurrect the cleared route.
      fetchSeqRef.current += 1;
      loadingRouteRef.current = false;
      routeRef.current = [];
      setPrimaryRoute([]);
      setTrimmedRoute(null);
      return;
    }
    const origin = userLocationRef.current;
    const dest = routeDestinationRef.current;
    if (!origin || !dest) return;
    void loadRoute(origin, dest);
  }, [routeDestKey, loadRoute]);

  // One GPS tick: update the marker, then maintain the route WITHOUT
  // refetching — trim the line behind the rider, and only re-route after a
  // sustained deviation (shared REROUTE_* thresholds in utils/routing).
  const handleLocationTick = useCallback(
    (coord: Coordinate) => {
      userLocationRef.current = coord;
      setUserLocation(coord);
      setGpsReady(true);

      const dest = routeDestinationRef.current;
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

  // Offer secondary leg: store→customer, fetched ONCE per offer (the memos are
  // stable for a given newOrder). Straight line on failure; cleared the moment
  // the offer goes away (accept/decline/timeout ⇒ newOrder null ⇒ re-run).
  useEffect(() => {
    if (!offerStore || !offerCustomer) {
      setPreviewLeg([]);
      return;
    }
    let cancelled = false;
    (async () => {
      let coords: Coordinate[];
      try {
        const result = await fetchDirections(offerStore, offerCustomer);
        coords = result
          ? result.coordinates
          : generateStraightLine(offerStore, offerCustomer);
      } catch {
        coords = generateStraightLine(offerStore, offerCustomer);
      }
      if (!cancelled) setPreviewLeg(coords);
    })();
    return () => {
      cancelled = true;
    };
  }, [offerStore, offerCustomer]);

  // Camera: fit the WHOLE offer preview (rider + store + customer) once per
  // offer, ~300ms in so the markers are mounted.
  const offerId = newOrder?.orderId ?? null;
  useEffect(() => {
    if (!offerId) return;
    const points: Coordinate[] = [];
    if (userLocationRef.current) points.push(userLocationRef.current);
    if (offerStore) points.push(offerStore);
    if (offerCustomer) points.push(offerCustomer);
    if (points.length < 2) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(points, {
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
  }, [offerId, offerStore, offerCustomer]);

  // Fit to a freshly loaded accepted-order route (the old map's behavior) —
  // skipped while an offer is visible since its fit above covers more. Keyed to
  // the FULL route only; per-tick trims never move the camera.
  useEffect(() => {
    if (primaryRoute.length === 0 || offerVisibleRef.current) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(primaryRoute, {
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
  }, [primaryRoute]);

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
      handleLocationTick(coord);

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
    // handleLocationTick is stable (its only dep, loadRoute, has [] deps) —
    // this still runs exactly once on mount.
  }, [handleLocationTick]);

  // ─── GPS watcher — DISPLAY ONLY, while driver is online ───────────────────
  // Keeps the rider marker live. It does NOT send anything to the API — the
  // app-wide tracker (utils/locationTracking) owns the single transmission
  // path to PATCH /driver/location.
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
          // Marker + route maintenance (trim / deviation check) — never a
          // per-tick Directions fetch; see handleLocationTick.
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
    // handleLocationTick is stable — the watcher is only re-created when the
    // driver toggles online/offline, exactly as before.
  }, [driver?.isOnline, handleLocationTick]);

  // ─── Accept order ─────────────────────────────────────────────────────────
  const handleAcceptOrder = async () => {
    if (!newOrder) return;
    const orderId = newOrder.orderId;

    try {
      await ordersApi.accept(orderId);
    } catch (err) {
      const apiErr = err as ApiError;
      console.warn("Accept failed:", apiErr?.message);
      clearNewOrder();
      // Tell the rider WHY the offer card vanished instead of silently
      // clearing it: no HTTP status ⇒ the request never reached the server
      // (network); 4xx ⇒ the offer expired / was taken by another driver;
      // 5xx ⇒ server hiccup, so suggest retrying rather than blaming the offer.
      dialog.show({
        title: t("onmap.acceptFailedTitle", "Couldn't accept the order"),
        message:
          apiErr?.status == null
            ? t(
                "onmap.offerNetworkMessage",
                "Network problem — check your connection and try again.",
              )
            : apiErr.status >= 400 && apiErr.status < 500
              ? t(
                  "onmap.offerUnavailableMessage",
                  "This offer has expired or was taken by another driver.",
                )
              : t(
                  "orderStatusErrors.updateFailed",
                  "Couldn't update the order status. Please try again.",
                ),
        tone: "error",
      });
      // Even a failed accept warrants a refetch — the offer may have expired
      // or been taken; the list is the truth.
      void refreshAssignments();
      return;
    }

    // clearNewOrder() also silences the incoming-order alarm (sound + haptics)
    // — see SocketContext.clearNewOrder.
    clearNewOrder();
    await refreshAssignments();
    // Open live navigation for the accepted order — same destination the Orders
    // tab's accept routes to. Without this the rider was left on the passive map
    // with no clear next step after accepting.
    router.push({
      pathname: "/orders/delivery_route",
      params: { id: orderId },
    });
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
    void refreshAssignments();
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
    void refreshAssignments();
  };

  // ─── Card tap → live navigation ───────────────────────────────────────────
  // delivery_route derives pickup vs dropoff from the order's live status.
  const handleOrderPress = useCallback(
    (assignment: OrderAssignment) => {
      router.push({
        pathname: "/orders/delivery_route",
        params: { id: assignment.orderId },
      });
    },
    [router],
  );

  // ─── Nearby offer Accept / Decline ───────────────────────────────────────
  // Reuses the same ordersApi endpoints the old Orders tab called. Accepting
  // also silences the offer card+alarm (the dispatch offer for this order may
  // still be ringing) and opens live navigation, matching the offer-card path.
  const handleAcceptNearby = useCallback(
    async (orderId: string) => {
      let alreadyActing = false;
      setActing((m) => {
        if (m[orderId]) {
          alreadyActing = true;
          return m;
        }
        return { ...m, [orderId]: true };
      });
      if (alreadyActing) return;
      try {
        await ordersApi.accept(orderId);
        stopAlarm();
        if (newOrder?.orderId === orderId) clearNewOrder();
        await refreshAssignments();
        router.push({
          pathname: "/orders/delivery_route",
          params: { id: orderId },
        });
      } catch (err) {
        console.warn("Accept failed:", (err as ApiError)?.message);
        void refreshAssignments();
      } finally {
        setActing((m) => ({ ...m, [orderId]: false }));
      }
    },
    [newOrder, clearNewOrder, stopAlarm, refreshAssignments, router],
  );

  const handleDeclineNearby = useCallback(
    async (orderId: string) => {
      let alreadyActing = false;
      setActing((m) => {
        if (m[orderId]) {
          alreadyActing = true;
          return m;
        }
        return { ...m, [orderId]: true };
      });
      if (alreadyActing) return;
      try {
        await ordersApi.reject(orderId, { reason: "too_far" });
        stopAlarm();
        if (newOrder?.orderId === orderId) clearNewOrder();
        await refreshAssignments();
      } catch (err) {
        console.warn("Decline failed:", (err as ApiError)?.message);
      } finally {
        setActing((m) => ({ ...m, [orderId]: false }));
      }
    },
    [newOrder, clearNewOrder, stopAlarm, refreshAssignments],
  );

  // ─── Advance button → next lifecycle status (GPS-gated server-side) ───────
  const handleAdvance = useCallback(
    async (assignment: OrderAssignment) => {
      const orderId = assignment.orderId;
      const next = nextStatus(assignment.status);
      if (!next) return;
      let alreadyBusy = false;
      setAdvancing((m) => {
        if (m[orderId]) {
          alreadyBusy = true;
          return m;
        }
        return { ...m, [orderId]: true };
      });
      if (alreadyBusy) return;

      try {
        await updateOrderStatusWithGps(orderId, next);
        // Server truth: on 'delivered' the assignment simply drops out of
        // ACTIVE_STATUSES; intermediate steps re-render with the new status.
        await refreshAssignments();
      } catch (err) {
        // Surfaces backend GPS_REQUIRED / OUT_OF_RANGE rejections as
        // translated messages — same pattern as the active-delivery screen.
        const msg = translateOrderStatusError(err);
        console.warn("Status update failed:", msg);
        dialog.show({
          title: t("delivery.statusFailed", "Cannot update status"),
          message: msg,
          tone: "error",
        });
      } finally {
        setAdvancing((m) => ({ ...m, [orderId]: false }));
      }
    },
    [dialog, refreshAssignments],
  );

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

  // NOTE: no reverse geocoding here — nothing on this screen renders an
  // address for the map center; currentRegion only feeds the zoom buttons.
  const handleRegionChangeComplete = (r: Region) => {
    setCurrentRegion(r);
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

      handleLocationTick(coord);

      mapRef.current?.animateToRegion(
        { ...coord, latitudeDelta: 0.008, longitudeDelta: 0.008 },
        600,
      );
    } catch (e) {
      console.warn(e);
    }
    setLocating(false);
  };

  // The polyline actually rendered: the live remainder once GPS ticks arrive,
  // else the full fetched route.
  const displayedRoute = trimmedRoute ?? primaryRoute;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.root} edges={{}}>
        {/* ── Map Container ── */}
        <View style={styles.mapContainer}>
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
              {/* Offer preview: lighter dashed store→customer leg, drawn UNDER
                  the primary line so the rider can judge the full trip. */}
              {previewLeg.length > 0 && (
                <Polyline
                  coordinates={previewLeg}
                  strokeColor="#B894FF"
                  strokeWidth={3}
                  lineCap="round"
                  lineJoin="round"
                  lineDashPattern={[8, 6]}
                />
              )}

              {/* Primary route (rider→offer store while an offer shows, else
                  rider→first active target) — same stacked shadow+main style
                  as the delivery-route screen. */}
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

              {/* One small marker per accepted order at its current target:
                  the store until pickup, the customer afterwards. Full
                  turn-by-turn routing lives on the delivery-route screen. */}
              {sheetOrders.map((a) => {
                const target = assignmentTarget(a);
                if (!target) return null;
                const toCustomer = POST_PICKUP_STATUSES.has(a.status);
                return (
                  <Marker
                    key={a.orderId}
                    coordinate={target}
                    anchor={{ x: 0.5, y: 1 }}
                    zIndex={10}
                  >
                    <View style={styles.orderMarker}>
                      <View
                        style={[
                          styles.orderMarkerInner,
                          toCustomer && styles.orderMarkerCustomer,
                        ]}
                      >
                        {toCustomer ? (
                          <Ionicons
                            name="home"
                            size={scale(16)}
                            color="#FFFFFF"
                          />
                        ) : (
                          <Image
                            source={storeSource(a.order?.store?.avatar)}
                            style={styles.orderMarkerAvatar}
                            resizeMode="cover"
                          />
                        )}
                      </View>
                      <View
                        style={[
                          styles.markerPointer,
                          toCustomer && styles.markerPointerCustomer,
                        ]}
                      />
                    </View>
                  </Marker>
                );
              })}

              {/* Offer markers — the offered store + its customer, removed the
                  moment the offer clears (accept/decline/timeout). Same visual
                  language as the accepted-order target markers. */}
              {newOrder && offerStore && (
                <Marker
                  key={`offer-store-${newOrder.orderId}`}
                  coordinate={offerStore}
                  anchor={{ x: 0.5, y: 1 }}
                  zIndex={9}
                >
                  <View style={styles.orderMarker}>
                    <View style={styles.orderMarkerInner}>
                      <Image
                        source={storeSource(newOrder.store?.logoUrl)}
                        style={styles.orderMarkerAvatar}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={styles.markerPointer} />
                  </View>
                </Marker>
              )}
              {newOrder && offerCustomer && (
                <Marker
                  key={`offer-customer-${newOrder.orderId}`}
                  coordinate={offerCustomer}
                  anchor={{ x: 0.5, y: 1 }}
                  zIndex={9}
                >
                  <View style={styles.orderMarker}>
                    <View
                      style={[
                        styles.orderMarkerInner,
                        styles.orderMarkerCustomer,
                      ]}
                    >
                      <Ionicons
                        name="home"
                        size={scale(16)}
                        color="#FFFFFF"
                      />
                    </View>
                    <View
                      style={[
                        styles.markerPointer,
                        styles.markerPointerCustomer,
                      ]}
                    />
                  </View>
                </Marker>
              )}

              {/* Rider Marker — only when GPS has a real fix */}
              <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
                <Image
                  source={RIDER_IMAGE}
                  style={{ width: 80, height: 80 }}
                  resizeMode="contain"
                />
              </Marker>
            </MapView>
          )}

          {/* ── Zoom + Location Buttons — native RTL swaps the absolute
              right offset automatically ── */}
          <View
            style={[
              styles.floatingButtons,
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

          {/* ── Active-order info overlay ── distance + ETA from the active
              assignment's routing data, plus the merchant prep countdown ring
              ticking down to estimatedReadyAt. Hidden while an offer card is on
              screen so the two never stack. */}
          {activeInfo && !currentRequest && (
            <View style={styles.activeInfoCard} pointerEvents="none">
              <View style={styles.activeInfoStats}>
                {!!activeInfo.distance && (
                  <View style={styles.activeInfoStat}>
                    <Ionicons
                      name="navigate-outline"
                      size={scale(16)}
                      color="#7900F3"
                    />
                    <Text style={styles.activeInfoValue}>
                      {activeInfo.distance}
                    </Text>
                    <Text style={styles.activeInfoLabel}>
                      {t("onmap.distance", "Distance")}
                    </Text>
                  </View>
                )}
                {!!activeInfo.eta && (
                  <View style={styles.activeInfoStat}>
                    <Ionicons
                      name="time-outline"
                      size={scale(16)}
                      color="#7900F3"
                    />
                    <Text style={styles.activeInfoValue}>{activeInfo.eta}</Text>
                    <Text style={styles.activeInfoLabel}>
                      {t("onmap.eta", "ETA")}
                    </Text>
                  </View>
                )}
              </View>
              {!!activeInfo.readyAt && (
                <PrepCountdownRing
                  readyAt={activeInfo.readyAt}
                  label={t("onmap.prepTime", "Prep time")}
                  readyLabel={t("onmap.ready", "Ready")}
                />
              )}
            </View>
          )}
        </View>

        {/* ── Order Request Card — shown only when there is a pending order.
            Distance/duration come straight from the dispatch socket payload. ── */}
        {currentRequest && (
          <OrderRequestCard
            key={currentRequest.id}
            visible
            bottomOffset={sheetHeight - verticalScale(40)}
            restaurantName={currentRequest.restaurantName}
            restaurantLocation={currentRequest.restaurantLocation}
            restaurantLogo={currentRequest.restaurantLogo}
            totalDistance={currentRequest.totalDistance}
            totalDuration={currentRequest.totalDuration}
            timerSeconds={currentRequest.expiresInSeconds}
            currency="IQD"
            items={currentRequest.items}
            onAccept={handleAcceptOrder}
            onDecline={handleDecline}
            onTimerEnd={handleTimerEnd}
          />
        )}

        {/* Mount the sheet when the rider holds active orders OR has new
            nearby offers (R4) — an empty "0" sheet was previously always
            pinned to the map. The expandSignal (bumped on focus) re-opens it
            whenever the rider returns from the live-navigation screen. */}
        {(sheetOrders.length > 0 || nearbyOrders.length > 0) && (
          <AcceptedOrdersSheet
            orders={sheetOrders}
            nearbyOrders={nearbyOrders}
            actingIds={acting}
            onAcceptNearby={handleAcceptNearby}
            onDeclineNearby={handleDeclineNearby}
            advancingIds={advancing}
            onOrderPress={handleOrderPress}
            onAdvance={handleAdvance}
            expandSignal={focusTick}
          />
        )}
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

  // Active-order info overlay (distance + ETA + prep countdown ring)
  activeInfoCard: {
    position: "absolute",
    top: verticalScale(60),
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background,
    borderRadius: scale(20),
    paddingVertical: scale(12),
    paddingHorizontal: spacing.lg,
    zIndex: 8,
    ...Shadow.card,
  },
  activeInfoStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  activeInfoStat: {
    alignItems: "center",
    gap: scale(2),
  },
  activeInfoValue: {
    fontSize: scale(15),
    fontWeight: "700",
    color: "#1A1A2E",
  },
  activeInfoLabel: {
    fontSize: scale(10),
    color: "#7C7890",
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

  // Accepted-order target markers (store until pickup, customer after)
  orderMarker: {
    alignItems: "center",
    marginBottom: scale(6),
  },
  orderMarkerInner: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: Colors.primary,
    padding: scale(2),
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  orderMarkerCustomer: {
    backgroundColor: "#22C55E",
  },
  orderMarkerAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: scale(17),
  },
  markerPointer: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: scale(4),
    borderRightWidth: scale(4),
    borderTopWidth: scale(10),
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: Colors.primary,
    marginTop: -scale(1),
  },
  markerPointerCustomer: {
    borderTopColor: "#22C55E",
  },

  // Floating Buttons
  floatingButtons: {
    position: "absolute",
    right: spacing.lg,
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
