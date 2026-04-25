import { DeliveryBottomSheet } from "@/components/ui";
import { LocationDotIcon } from "@/components/ui/icons/LocationDotIcon";
import { isRTL } from "@/constants/i18n";
import { Colors, Shadow } from "@/constants/theme";
import { useAppFont } from "@/hooks/useAppFont";
import { radius, scale, spacing, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
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

// ─── Configuration ───────────────────────────────────────────────────────────
const GOOGLE_DIRECTIONS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const DEFAULT_REGION: Region = {
  latitude: 35.5642,
  longitude: 45.4321,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// Destination coordinates (The Grill Restaurant)
const DESTINATION = {
  latitude: 35.5642,
  longitude: 45.4321,
};

// Starting point coordinates (driver/user starting location)
const STARTING_POINT = {
  latitude: 35.555,
  longitude: 45.418,
};

// ─── Polyline Decoder Utility ────────────────────────────────────────────────
// Decodes Google’s encoded polyline format into coordinate array
// Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm

interface DecodedCoordinate {
  latitude: number;
  longitude: number;
}

function decodePolyline(encoded: string): DecodedCoordinate[] {
  const coordinates: DecodedCoordinate[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  let factor = Math.pow(10, 5);

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    let latitudeDelta = result & 1 ? ~(result >> 1) : result >> 1;
    latitude += latitudeDelta;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    let longitudeDelta = result & 1 ? ~(result >> 1) : result >> 1;
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

// ─── Directions API Service ──────────────────────────────────────────────────
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

// Fallback straight line when API is unavailable
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
export default function DeliveryRoute() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const rtl = isRTL(i18n.language);
  const mapRef = useRef<MapView>(null);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["20%", "45%"], []);

  const [sheetHeight, setSheetHeight] = useState(verticalScale(160)); // default collapsed height

  const handleSheetChange = (index: number) => {
    // manually track position based on snap index
    if (index === 0) {
      setSheetHeight(verticalScale(160)); // collapsed ~20%
    } else {
      setSheetHeight(verticalScale(350)); // expanded ~45%
    }
  };
  const [locating, setLocating] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(true);
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
  // Fetch directions from API
  const loadRoute = useCallback(
    async (origin: { latitude: number; longitude: number }) => {
      setLoadingRoute(true);
      setRouteError(false);

      try {
        const result = await fetchDirections(origin, DESTINATION);

        if (result) {
          setRouteCoordinates(result.coordinates);
          setRouteInfo({
            distance: result.distance,
            duration: result.duration,
          });
        } else {
          // Fallback to straight line
          setRouteCoordinates(generateStraightLine(origin, DESTINATION));
          setRouteError(true);
        }
      } catch {
        setRouteCoordinates(generateStraightLine(origin, DESTINATION));
        setRouteError(true);
      }

      setLoadingRoute(false);
    },
    [],
  );

  // Initial route load
  useEffect(() => {
    loadRoute(STARTING_POINT);
  }, [loadRoute]);

  // Fit map to show entire route
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
    setCurrentRegion(r); // ← add this line
    await reverseGeocode(r.latitude, r.longitude);
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

      // Refetch route from new location
      await loadRoute(newLocation);
    } catch (e) {
      console.warn(e);
    }
    setLocating(false);
  };

  const getOriginForRoute = () => userLocation ?? STARTING_POINT;

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
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons
                name={rtl ? "arrow-forward" : "arrow-back"}
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

          {/* ── Map ── */}
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={DEFAULT_REGION}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation={false}
            showsMyLocationButton={false}
          >
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="rgba(121, 0, 243, 0.15)"
                strokeWidth={12}
                lineCap="round"
                lineJoin="round"
              />
            )}
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#B894FF"
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
              />
            )}
            <Marker
              coordinate={DESTINATION}
              anchor={{ x: 0.5, y: 1 }}
              centerOffset={{ x: 0, y: -scale(12) }}
              zIndex={10}
            >
              <View style={styles.destinationMarker}>
                <View style={styles.destinationMarkerInner}>
                  <Image
                    source={{
                      uri: "https://tse1.mm.bing.net/th/id/OIP.AiK2XKBbcs31B24ebg5mAQHaGL?rs=1&pid=ImgDetMain&o=7&rm=3",
                    }}
                    style={styles.markerAvatar}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.markerPointer} />
              </View>
            </Marker>
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
        </View>

        {/* ── Zoom + Location Buttons ── */}
        <View
          style={[
            styles.floatingButtons,
            rtl ? { left: spacing.lg } : { right: spacing.lg },
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
              restaurantName="The Grill Restaurant"
              restaurantLocation="Sulaimany-baxtyari"
              activeTab="navigate"
              onCall={() => {}}
              onArrived={() => {}}
              onCancelDelivery={() => {}}
              onNavigate={() => {}}
              onOrderDetails={() => {
                router.push("/orders");
              }}
              onSupport={() => {
                router.push("/inbox/support_chat");
              }}
            />
          </BottomSheetView>
        </BottomSheet>
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
