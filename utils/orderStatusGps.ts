import * as Location from "expo-location";
import { ordersApi } from "@/api";
import type { DriverNextStatus } from "@/api/types";

// Backend range-gates these transitions — the request must include the rider's
// current GPS so the server can verify proximity to the store / customer.
// `arrived` (arrived at customer) reuses the deliveredDistanceThreshold on the
// backend since both events happen at the customer's address.
const GPS_GATED: ReadonlySet<DriverNextStatus> = new Set<DriverNextStatus>([
  "arrived_store",
  "arrived",
  "delivered",
]);

/**
 * Drive `ordersApi.updateStatus` while attaching the rider's current GPS for
 * range-gated transitions (arrived_store, delivered). The backend rejects
 * with "You are not in range yet" / "Rider location is required..." when the
 * rider is outside the admin-configured radius; those errors propagate as-is
 * so the calling screen can surface them in an Alert.
 */
export async function updateOrderStatusWithGps(
  orderId: string,
  status: DriverNextStatus,
): Promise<void> {
  let coords: { lat: number; lng: number } | undefined;
  if (GPS_GATED.has(status)) {
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }
    } catch {
      // Fall through with coords=undefined — backend will return 400
      // with code GPS_REQUIRED, which the screen surfaces to the rider.
    }
  }
  await ordersApi.updateStatus(orderId, {
    status,
    lat: coords?.lat,
    lng: coords?.lng,
  });
}
