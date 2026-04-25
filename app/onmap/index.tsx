import {
    AcceptedOrderItem,
    AcceptedOrdersSheet,
} from "@/components/ui/AcceptedOrdersSheet";
import DriverStatusHeader from "@/components/ui/DriverStatusHeader";
import { LocationDotIcon } from "@/components/ui/icons/LocationDotIcon";
import OrderRequestCard from "@/components/ui/OrderRequestCard";
import { isRTL } from "@/constants/i18n";
import { Colors, Shadow } from "@/constants/theme";
import { radius, scale, spacing, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { t } from "i18next";
import { useCallback, useEffect, useRef, useState } from "react";
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

// ─── Configuration ───────────────────────────────────────────────────────────
const GOOGLE_DIRECTIONS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const DEFAULT_REGION: Region = {
  latitude: 35.5642,
  longitude: 45.4321,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const DESTINATION = {
  latitude: 35.5642,
  longitude: 45.4321,
};

const STARTING_POINT = {
  latitude: 35.555,
  longitude: 45.418,
};

// ─── Polyline Decoder ────────────────────────────────────────────────────────
interface DecodedCoordinate {
  latitude: number;
  longitude: number;
}

function decodePolyline(encoded: string): DecodedCoordinate[] {
  const coordinates: DecodedCoordinate[] = [];
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

// ─── Types ───────────────────────────────────────────────────────────────────
interface LocationInfo {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface RouteInfo {
  coordinates: DecodedCoordinate[];
  distance: string;
  duration: string;
}

// ─── Directions API ──────────────────────────────────────────────────────────
async function fetchDirections(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
): Promise<RouteInfo | null> {
  if (!GOOGLE_DIRECTIONS_API_KEY) {
    console.warn(
      "Google Directions API key not found. Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file",
    );
    return null;
  }

  const originStr = `${origin.latitude},${origin.longitude}`;
  const destinationStr = `${destination.latitude},${destination.longitude}`;
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&mode=driving&key=${GOOGLE_DIRECTIONS_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "OK") {
      console.warn("Directions API error:", data.status, data.error_message);
      return null;
    }

    if (!data.routes || data.routes.length === 0) {
      console.warn("No routes found");
      return null;
    }

    const route = data.routes[0];
    const leg = route.legs[0];
    const encodedPolyline = route.overview_polyline.points;

    return {
      coordinates: decodePolyline(encodedPolyline),
      distance: leg.distance.text,
      duration: leg.duration.text,
    };
  } catch (error) {
    console.error("Failed to fetch directions:", error);
    return null;
  }
}

function generateStraightLine(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
): DecodedCoordinate[] {
  const steps = 50;
  const coordinates: DecodedCoordinate[] = [];

  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    coordinates.push({
      latitude: start.latitude + (end.latitude - start.latitude) * progress,
      longitude: start.longitude + (end.longitude - start.longitude) * progress,
    });
  }

  return coordinates;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function OnMap() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const rtl = isRTL(i18n.language);
  const mapRef = useRef<MapView>(null);
  const [acceptedOrders, setAcceptedOrders] = useState<AcceptedOrderItem[]>([]);
  // ─── State ─────────────────────────────────────────────────────────────
  const [showOrder, setShowOrder] = useState(true);
  const [currentRequestIndex, setCurrentRequestIndex] = useState(0);
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null);
  const [sheetHeight, setSheetHeight] = useState(verticalScale(160));
  const [locating, setLocating] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [activeDestination, setActiveDestination] = useState(DESTINATION);
  const [activeMarkerImage, setActiveMarkerImage] = useState<string | null>(
    null,
  );

  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<DecodedCoordinate[]>(
    [],
  );
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
  } | null>(null);
  const [routeError, setRouteError] = useState(false);
  const [selected, setSelected] = useState<LocationInfo>({
    name: "Sulaymaniyah",
    address: "Sulaymaniyah, Iraq",
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });
  const [currentRegion, setCurrentRegion] = useState<Region>(DEFAULT_REGION);
  type MockRequestOrder = {
    id: string;
    restaurantName: string;
    restaurantLocation: string;
    restaurantLogo: string;

    restaurantCoordinate: {
      latitude: number;
      longitude: number;
    };

    totalDistance: string;
    totalDuration: string;
    price: string;
    pickupLocation: string;
    dropoffLocation: string;
    items: {
      id: string;
      quantity: number;
      name: string;
      price: number;
    }[];
  };

  const mockRequestOrders: MockRequestOrder[] = [
    {
      id: "req-1",
      restaurantName: "The Grill Restaurant",
      restaurantLocation: "Sulaimany-baxtyari",
      restaurantCoordinate: {
        latitude: 35.5642,
        longitude: 45.4321,
      },
      restaurantLogo:
        "https://tse1.mm.bing.net/th/id/OIP.AiK2XKBbcs31B24ebg5mAQHaGL?rs=1&pid=ImgDetMain",
      totalDistance: "3.2 km",
      totalDuration: "12 min",
      price: "4,000IQD",
      pickupLocation: "Baxtyary",
      dropoffLocation: "Ashty Street",
      items: [
        { id: "1", quantity: 2, name: "Chicken Burger", price: 12000 },
        { id: "2", quantity: 1, name: "Pepsi", price: 1500 },
      ],
    },
    {
      id: "req-2",
      restaurantName: "Pizza House",
      restaurantLocation: "Salim Street",
      restaurantLogo:
        "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200",

      restaurantCoordinate: {
        latitude: 35.5665,
        longitude: 45.4208,
      },

      totalDistance: "2.1 km",
      totalDuration: "8 min",
      price: "3,500IQD",
      pickupLocation: "Salim Street",
      dropoffLocation: "Bakrajo",
      items: [
        { id: "1", quantity: 1, name: "Pepperoni Pizza", price: 15000 },
        { id: "2", quantity: 2, name: "Cola", price: 2000 },
      ],
    },
    {
      id: "req-3",
      restaurantName: "Burger City",
      restaurantLocation: "Majidi Mall",
      restaurantLogo:
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200",

      restaurantCoordinate: {
        latitude: 35.5589,
        longitude: 45.4355,
      },

      totalDistance: "4.5 km",
      totalDuration: "18 min",
      price: "5,000IQD",
      pickupLocation: "Majidi Mall",
      dropoffLocation: "Toya Malik",
      items: [
        { id: "1", quantity: 1, name: "Double Burger", price: 13000 },
        { id: "2", quantity: 1, name: "Fries", price: 3000 },
      ],
    },
  ];
  const currentRequest = mockRequestOrders[currentRequestIndex];
  const handleAcceptOrder = () => {
    if (!currentRequest) return;

    const newOrderId = currentRequest.id;

    setAcceptedOrders((prev) => [
      {
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

          loadRoute(STARTING_POINT, currentRequest.restaurantCoordinate);

          setAcceptedOrders((orders) =>
            orders.map((order) =>
              order.id === newOrderId
                ? {
                    ...order,
                    actionType: "deliver",
                    onDeliver: () => {
                      setAcceptedOrders((items) =>
                        items.filter((item) => item.id !== newOrderId),
                      );

                      setActiveDeliveryId(null);
                      setActiveMarkerImage(null);
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
        },
      },
      ...prev,
    ]);

    const nextIndex = currentRequestIndex + 1;

    if (nextIndex < mockRequestOrders.length) {
      setCurrentRequestIndex(nextIndex);
      setShowOrder(true);
    } else {
      setShowOrder(false);
    }
  };
  const showNextRequest = () => {
    const nextIndex = currentRequestIndex + 1;

    if (nextIndex < mockRequestOrders.length) {
      setCurrentRequestIndex(nextIndex);
      setShowOrder(true);
    } else {
      setShowOrder(false);
    }
  };
  // ─── Zoom Handlers ──────────────────────────────────────────────────────
  const handleZoomIn = () => {
    const newRegion = {
      ...currentRegion,
      latitudeDelta: currentRegion.latitudeDelta / 2,
      longitudeDelta: currentRegion.longitudeDelta / 2,
    };
    mapRef.current?.animateToRegion(newRegion, 300);
  };

  const handleZoomOut = () => {
    const newRegion = {
      ...currentRegion,
      latitudeDelta: currentRegion.latitudeDelta * 2,
      longitudeDelta: currentRegion.longitudeDelta * 2,
    };
    mapRef.current?.animateToRegion(newRegion, 300);
  };

  // ─── Route Loading ──────────────────────────────────────────────────────
  const loadRoute = useCallback(
    async (
      origin: { latitude: number; longitude: number },
      destination = activeDestination,
    ) => {
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
          setRouteCoordinates(generateStraightLine(origin, destination));
          setRouteError(true);
        }
      } catch {
        setRouteCoordinates(generateStraightLine(origin, destination));
        setRouteError(true);
      }

      setLoadingRoute(false);
    },
    [activeDestination],
  );

  useEffect(() => {
    loadRoute(STARTING_POINT);
  }, [loadRoute]);

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

  // ─── Geocoding ──────────────────────────────────────────────────────────
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

  // ─── Current Location ───────────────────────────────────────────────────
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

      const newLocation = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      setUserLocation(newLocation);

      const newRegion: Region = {
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      };

      mapRef.current?.animateToRegion(newRegion, 600);
      await reverseGeocode(newLocation.latitude, newLocation.longitude);
      await loadRoute(newLocation);
    } catch (e) {
      console.warn(e);
    }
    setLocating(false);
  };

  const getOriginForRoute = () => userLocation ?? STARTING_POINT;

  // ─── Render ─────────────────────────────────────────────────────────────
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
              name="Ahmed Mohammed"
              avatar="https://media.istockphoto.com/id/1038692170/photo/smiling-courier-man-holding-a-box-package.jpg?s=612x612&w=0&k=20&c=IhJYTjkchSQwnNIx0hY4ExkCoLQZatyZt-MwCgL7GF4="
              earnings="18,500"
              isOnline={true}
              onToggleStatus={() => {}}
            />
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

          {/* ── Map ── */}
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={DEFAULT_REGION}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation={false}
            showsMyLocationButton={false}
          >
            {/* Route Shadow */}
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

            {/* Destination Marker */}
            <Marker
              coordinate={activeDestination}
              anchor={{ x: 0.5, y: 1 }}
              centerOffset={{ x: 0, y: -scale(12) }}
              zIndex={10}
            >
              <View style={styles.destinationMarker}>
                <View style={styles.destinationMarkerInner}>
                  <Image
                    source={{
                      uri:
                        activeMarkerImage ||
                        "https://www.fmt.se/wp-content/uploads/2023/02/logo-placeholder-image.png",
                    }}
                    style={styles.markerAvatar}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.markerPointer} />
              </View>
            </Marker>

            {/* Rider Marker */}
            <Marker
              coordinate={getOriginForRoute()}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <Image
                source={RIDER_IMAGE}
                style={{ width: 80, height: 80 }}
                resizeMode="contain"
              />
            </Marker>
          </MapView>

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

        {/* ── Order Request Card ── */}
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
            timerSeconds={10}
            currency="IQD"
            isRTL={rtl}
            items={currentRequest.items}
            onAccept={handleAcceptOrder}
            onDecline={showNextRequest}
            onTimerEnd={showNextRequest}
          />
        )}

        <AcceptedOrdersSheet orders={acceptedOrders} />
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
