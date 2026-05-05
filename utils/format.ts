/**
 * Format helpers for currency, distance, duration, and plain numbers.
 *
 * Currency formatting matches the existing rider UI's tight format
 * (no space between number and currency code, e.g. "4,000IQD") so
 * existing screens can swap mock strings for live values without
 * any visual change.
 */

export function formatNumber(amount: number | string | null | undefined): string {
  if (amount == null) return "0";
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-US");
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = "IQD",
): string {
  if (amount == null) return `0${currency}`;
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return `0${currency}`;
  return `${n.toLocaleString("en-US")}${currency}`;
}

export function formatDistanceKm(
  distance: number | string | null | undefined,
): string {
  if (distance == null) return "";
  const n = typeof distance === "number" ? distance : Number(distance);
  if (!Number.isFinite(n)) return "";
  return `${n.toFixed(1)} km`;
}

export function formatDurationMinutes(
  minutes: number | string | null | undefined,
): string {
  if (minutes == null) return "";
  const n = typeof minutes === "number" ? minutes : Number(minutes);
  if (!Number.isFinite(n)) return "";
  return `${Math.round(n)} min`;
}
