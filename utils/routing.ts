// ─── Shared map-routing helpers ───────────────────────────────────────────────
// Single home for the Google Directions fetch + polyline decoding that used to
// be duplicated in app/onmap/index.tsx and app/orders/delivery_route.tsx, plus
// the geo helpers that power live navigation: trimming the polyline behind the
// rider and detecting route deviation for a re-route.

// ─── Configuration ────────────────────────────────────────────────────────────
const GOOGLE_DIRECTIONS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Deviation-based re-route tuning, shared by both map screens: re-fetch the
// route only after the rider has been >60 m off the polyline for 2 consecutive
// GPS ticks AND the previous fetch is at least 20 s old — never on every tick.
export const REROUTE_DEVIATION_METERS = 60;
export const REROUTE_CONSECUTIVE_TICKS = 2;
export const REROUTE_MIN_INTERVAL_MS = 20_000;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteInfo {
  coordinates: Coordinate[];
  distance: string;
  duration: string;
}

// ─── Polyline Decoder ─────────────────────────────────────────────────────────
// Decodes Google's encoded polyline format into a coordinate array.
// Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
export function decodePolyline(encoded: string): Coordinate[] {
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
export async function fetchDirections(
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

// Straight-line fallback when the Directions API fails
export function generateStraightLine(
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

// ─── Geo helpers ──────────────────────────────────────────────────────────────
const EARTH_RADIUS_M = 6_371_000;
const METERS_PER_DEGREE = 111_320; // ≈ meters per degree of latitude
const toRadians = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two coordinates, in meters. */
export function haversineMeters(a: Coordinate, b: Coordinate): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Closest point of a polyline to `point`, using point-to-SEGMENT projection
 * (a local equirectangular approximation — plenty accurate at city scale).
 * Vertex-only distance would falsely report "off route" mid-way along long
 * straight segments, where Google's overview polyline has sparse vertices.
 *
 * Returns the perpendicular distance in meters and the index of the first
 * polyline vertex that is NOT behind the rider, i.e. `coords.slice(index)`
 * is the part of the route still ahead.
 */
export function nearestPointOnPolyline(
  point: Coordinate,
  coords: Coordinate[],
): { index: number; distanceMeters: number } {
  if (coords.length === 0) {
    return { index: 0, distanceMeters: Number.POSITIVE_INFINITY };
  }
  if (coords.length === 1) {
    return { index: 0, distanceMeters: haversineMeters(point, coords[0]) };
  }

  // Project into a flat x/y plane (meters) centered on `point`.
  const cosLat = Math.cos(toRadians(point.latitude));
  const toXY = (c: Coordinate) => ({
    x: (c.longitude - point.longitude) * cosLat * METERS_PER_DEGREE,
    y: (c.latitude - point.latitude) * METERS_PER_DEGREE,
  });

  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  let a = toXY(coords[0]);
  for (let i = 0; i < coords.length - 1; i++) {
    const b = toXY(coords[i + 1]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    // The rider is the origin (0,0); t = how far along segment a→b the
    // perpendicular foot lands, clamped to the segment.
    const t =
      lengthSq === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lengthSq));
    const footX = a.x + t * dx;
    const footY = a.y + t * dy;
    const distance = Math.hypot(footX, footY);
    if (distance < bestDistance) {
      bestDistance = distance;
      // t > 0 ⇒ vertex i is behind the rider; the next vertex to keep is i+1.
      bestIndex = t > 0 ? Math.min(i + 1, coords.length - 1) : i;
    }
    a = b;
  }

  return { index: bestIndex, distanceMeters: bestDistance };
}

/**
 * The portion of `coords` still ahead of the rider, with the live `point`
 * prepended — render this so the route line shrinks behind the rider instead
 * of staying painted from the original origin.
 */
export function remainingRoute(point: Coordinate, coords: Coordinate[]): Coordinate[] {
  if (coords.length === 0) return [];
  const { index } = nearestPointOnPolyline(point, coords);
  return [point, ...coords.slice(index)];
}
