/**
 * Single source of truth for the rider-side delivery status chain:
 *
 *   accepted → picked_up → on_the_way → arrived → delivered
 *
 * The backend GPS-gates `picked_up` (~200 m from the store) and `arrived`
 * (~500 m from the customer), so every step is a single tap once the rider is
 * physically there — see utils/orderStatusGps.ts.
 *
 * Deliberately NOT covered here:
 *  - assigned → accepted goes through the dedicated accept endpoint
 *    (`ordersApi.accept`), not the status-update endpoint.
 *  - `arrived_store` is legacy-only (orders that reached it before the chain
 *    rollout): it is rendered and advanced to `picked_up`, but never offered
 *    as a *next* step.
 */
import type { DriverNextStatus } from "@/api/types";

export type LifecycleStep = {
  /** i18n key for the CTA that advances the order out of this status. */
  labelKey: string;
  /** English fallback when the key is missing from a locale. */
  defaultLabel: string;
  /** The status a single CTA tap moves the order to. */
  next: DriverNextStatus;
};

const FORWARD_STEPS: Record<string, LifecycleStep> = {
  accepted: {
    labelKey: "delivery.pickedUp",
    defaultLabel: "Picked Up",
    next: "picked_up",
  },
  // Legacy in-flight orders only — advance straight to picked_up.
  arrived_store: {
    labelKey: "delivery.pickedUp",
    defaultLabel: "Picked Up",
    next: "picked_up",
  },
  on_the_way: {
    labelKey: "delivery.arrivedAtCustomer",
    defaultLabel: "Arrived at Customer",
    next: "arrived",
  },
  arrived: {
    labelKey: "delivery.delivered",
    defaultLabel: "Delivered",
    next: "delivered",
  },
};

/**
 * Full next-step descriptor for a status, or null when the chain is finished
 * or the status isn't part of the forward flow (assigned, delivered,
 * cancelled, …).
 */
export function nextStep(
  status: string | null | undefined,
): LifecycleStep | null {
  if (!status) return null;
  return FORWARD_STEPS[status] ?? null;
}

/** The status a single advance tap should move the order to. */
export function nextStatus(
  status: string | null | undefined,
): DriverNextStatus | null {
  return nextStep(status)?.next ?? null;
}

/** i18n key for the advance-CTA label. */
export function nextLabelKey(
  status: string | null | undefined,
): string | null {
  return nextStep(status)?.labelKey ?? null;
}

/**
 * Assignment statuses that count as an in-progress delivery (post-accept,
 * pre-delivered). Shared by the Orders tab and the map's accepted-orders
 * sheet — keep the two screens in lockstep.
 */
export const ACTIVE_STATUSES: ReadonlySet<string> = new Set([
  "accepted",
  "arrived_store",
  "picked_up",
  "on_the_way",
  "arrived",
]);

/** Statuses where the rider's current target is the customer, not the store. */
export const POST_PICKUP_STATUSES: ReadonlySet<string> = new Set([
  "on_the_way",
  "arrived",
]);
