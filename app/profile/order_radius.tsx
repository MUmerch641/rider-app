import type { ApiError } from "@/api";
import { isRTL } from "@/constants/i18n";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context";
import { useAppFont } from "@/hooks/useAppFont";
import {
  fontSize,
  radius,
  scale,
  spacing,
  verticalScale,
} from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

const RIDER_SVG = `<svg width="22" height="18" viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M21.6233 7.82167C21.2008 3.26083 17.0733 0 12.5233 0C12.3175 0 12.1117 0.0108333 11.9058 0.0216666C0 0.801667 0 14.3 0 14.3V15.1667C0 16.3583 0.975 17.3333 2.16667 17.3333H13C18.0592 17.3333 22.1108 12.9892 21.6233 7.82167ZM3.53167 8.19C4.14917 6.7925 4.91833 5.64417 5.85 4.73417L9.77167 6.39167C10.4217 6.6625 10.8333 7.29083 10.8333 7.995C10.8333 8.95917 10.0533 9.73917 9.08917 9.73917H2.94667C3.10917 9.24083 3.29333 8.72083 3.53167 8.19ZM17.81 13.0433C17.1995 13.7117 16.4566 14.2456 15.6285 14.6112C14.8004 14.9768 13.9052 15.1659 13 15.1667H2.16667V14.3C2.16667 14.2783 2.1775 13.3033 2.42667 11.9167H9.08917C11.245 11.9167 13 10.1617 13 8.00583C13 6.435 12.0575 5.01583 10.6167 4.40917L7.90833 3.26083C9.1 2.64333 10.4758 2.28583 12.0467 2.18833C12.2092 2.16667 12.3717 2.16667 12.5233 2.16667C16.1092 2.16667 19.1642 4.73417 19.4675 8.0275C19.6408 9.89083 19.0558 11.6675 17.81 13.0433Z" fill="white"/>
</svg>`;
const INFO_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke="#7C7890" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12 8V13" stroke="#7C7890" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11.9946 16H12.0036" stroke="#7C7890" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

export default function OrderRadiusScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const font = useAppFont();
  const rtl = isRTL(i18n.language);
  const { driver, updateProfile } = useAuth();
  const [radiusKm, setRadiusKm] = useState<number>(driver?.orderRadiusKm ?? 5);
  const [saving, setSaving] = useState(false);
  const mapRef = useRef<MapView>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Hydrate when driver becomes available after first render.
  useEffect(() => {
    if (driver?.orderRadiusKm != null) setRadiusKm(driver.orderRadiusKm);
  }, [driver?.orderRadiusKm]);

  const handleSetRadius = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateProfile({ orderRadiusKm: radiusKm });
      router.back();
    } catch (err) {
      const apiErr = err as ApiError;
      Alert.alert(
        t("orderRadius.saveFailed", { defaultValue: "Save failed" }),
        apiErr?.message ?? "",
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startLocation = async () => {
      setLocationLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(coords);

      mapRef.current?.animateToRegion(
        {
          ...coords,
          latitudeDelta: 0.018,
          longitudeDelta: 0.018,
        },
        700,
      );

      setLocationLoading(false);

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (loc) => {
          const liveCoords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };

          setCurrentLocation(liveCoords);
        },
      );
    };

    startLocation();

    return () => {
      subscription?.remove();
    };
  }, []);
  return (
    <SafeAreaView style={styles.root} edges={{}}>
      <View style={styles.mapBg}>
        {currentLocation && (
          <MapView
            style={StyleSheet.absoluteFillObject}
            initialRegion={{
              ...currentLocation,
              latitudeDelta: 0.018,
              longitudeDelta: 0.018,
            }}
            scrollEnabled={true}
            zoomEnabled={false}
            rotateEnabled={true}
            pitchEnabled={true}
          />
        )}

        <View
          style={[
            styles.header,
            { flexDirection: rtl ? "row-reverse" : "row" },
          ]}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons
              name={rtl ? "arrow-forward" : "arrow-back"}
              size={scale(22)}
              color="#111"
            />
          </TouchableOpacity>

          <Text style={[styles.title, { fontFamily: font.medium }]}>
            {t("orderRadius.title")}
          </Text>
        </View>
        {locationLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2F80FF" />
            <Text style={[styles.loadingText, { fontFamily: font.regular }]}>
              {t("orderRadius.findLoading")}
            </Text>
          </View>
        )}
        {currentLocation && (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            ...currentLocation,
            latitudeDelta: 0.018,
            longitudeDelta: 0.018,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          <View
            style={[
              styles.infoBox,
              { flexDirection: rtl ? "row-reverse" : "row" },
            ]}
          >
            <SvgXml xml={INFO_SVG} width={scale(24)} height={scale(24)} />
            <Text
              style={[
                styles.infoText,
                {
                  fontFamily: font.regular,
                  textAlign: rtl ? "right" : "left",
                },
              ]}
            >
              {t("orderRadius.description")}
            </Text>
          </View>
          {currentLocation && (
            <>
              <Circle
                center={currentLocation}
                radius={radiusKm * 1000}
                strokeColor="#006BFF"
                strokeWidth={2}
                fillColor="rgba(70, 140, 255, 0.28)"
              />

              <Marker coordinate={currentLocation} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.riderDot}>
                  <SvgXml
                    xml={RIDER_SVG}
                    width={scale(22)}
                    height={scale(18)}
                  />
                </View>
              </Marker>
            </>
          )}
        </MapView>
        )}

        <View style={styles.bottomSheet}>
          <Text style={[styles.radiusValue, { fontFamily: font.bold }]}>
            {radiusKm}
            {t("orderRadius.km")}
          </Text>

          <View
            style={[
              styles.rangeLabels,
              { flexDirection: rtl ? "row-reverse" : "row" },
            ]}
          >
            <Text style={[styles.rangeText, { fontFamily: font.regular }]}>
              2{t("orderRadius.km")}
            </Text>
            <Text style={[styles.rangeText, { fontFamily: font.regular }]}>
              10
              {t("orderRadius.km")}
            </Text>
          </View>

          <Slider
            style={[styles.slider, { transform: rtl ? [{ scaleX: -1 }] : [] }]}
            minimumValue={2}
            maximumValue={10}
            step={1}
            value={radiusKm}
            onValueChange={setRadiusKm}
            minimumTrackTintColor="#000000"
            maximumTrackTintColor="#D7D7D7"
            thumbTintColor="#000000"
          />

          <LinearGradient
            colors={["#B894FF", "#8B45FF", "#B894FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.buttonGrad, saving && { opacity: 0.7 }]}
          >
            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.85}
              onPress={handleSetRadius}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <View style={styles.checkCircle}>
                    <Ionicons
                      name="checkmark"
                      size={scale(14)}
                      color="#9B5BFF"
                    />
                  </View>
                  <Text style={[styles.buttonText, { fontFamily: font.bold }]}>
                    {t("orderRadius.setRadius")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  mapBg: {
    flex: 1,
  },
  header: {
    paddingTop: scale(60),
    height: verticalScale(120),
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: scale(16),
    paddingBottom: scale(20),
    zIndex: 1,
  },
  backBtn: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: "#F7F5FA",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: fontSize.xl,
    color: "#241933",
  },
  infoBox: {
    marginTop: verticalScale(150),
    marginHorizontal: spacing.xl,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 1,
    borderColor: Colors.background,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: verticalScale(16),
    alignItems: "center",
    gap: scale(12),
  },
  infoIcon: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    borderWidth: 1.4,
    borderColor: "#8C86A3",
    alignItems: "center",
    justifyContent: "center",
  },
  infoTextIcon: {
    color: "#8C86A3",
    fontSize: scale(16),
    fontWeight: "700",
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.base,
    lineHeight: scale(23),
    color: "#5F5875",
  },
  radiusCircle: {
    position: "absolute",
    top: "33%",
    alignSelf: "center",
    width: scale(240),
    height: scale(240),
    borderRadius: scale(120),
    borderWidth: scale(2),
    borderColor: "#006BFF",
    backgroundColor: "rgba(70, 140, 255, 0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  riderDot: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: "#2F80FF",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: scale(42),
    borderTopRightRadius: scale(42),
    paddingHorizontal: spacing.xl,
    paddingTop: verticalScale(22),
    paddingBottom: verticalScale(34),
  },
  radiusValue: {
    textAlign: "center",
    fontSize: fontSize.lg,
    color: "#111111",
    marginBottom: verticalScale(2),
  },
  rangeLabels: {
    justifyContent: "space-between",
    marginBottom: verticalScale(-8),
  },
  rangeText: {
    fontSize: fontSize.sm,
    color: "#9B96B0",
    fontWeight: "600",
  },
  slider: {
    width: "100%",
    height: verticalScale(46),
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  loadingText: {
    marginTop: verticalScale(12),
    fontSize: fontSize.base,
    color: "#5F5875",
    fontWeight: "600",
  },
  buttonGrad: {
    marginTop: verticalScale(18),
    borderRadius: radius.full,
    shadowColor: "#8B45FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  button: {
    height: verticalScale(66),
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: scale(10),
  },
  checkCircle: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: fontSize.lg,
    color: "#FFFFFF",
  },
});
