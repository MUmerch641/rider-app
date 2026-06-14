// Maps backend driver-notification payloads (push `data` + stored `actionUrl`)
// to REAL expo-router routes in THIS app. The backend sends order pushes with
// `data.orderId` (and sometimes an `actionUrl` like `/orders/<id>` or
// `/(tabs)/orders`) and support pushes with `actionUrl: /support/<ticketId>`
// — none of those are real routes here, so pushing the raw actionUrl lands the
// rider on the "Unmatched Route" screen. Every notification navigation must go
// through this resolver instead.
//
// Real routes (see app/):
//   /(tabs)                 — Orders tab (the (tabs) index re-exports app/orders)
//   /(tabs)/onmap           — live map
//   /(tabs)/inbox           — notifications + support list tab
//   /orders/delivery_route?id=…   — live navigation for one order
//   /inbox                  — notifications/support inbox
//   /inbox/support_chat?threadId=…  — a support chat thread
import type { Href } from "expo-router";

export type NotificationPayload = {
  type?: string;
  orderId?: string;
  actionUrl?: string;
  threadId?: string;
};

/**
 * Resolve a driver notification to a navigable route.
 * - Order notifications → the order's live navigation screen
 *   (/orders/delivery_route?id=…), or the Orders tab when there's no id.
 * - Support notifications → the support chat thread (or the inbox support list).
 * - Everything else → the notifications inbox (the only acceptable fallback,
 *   for truly unrouteable notifications).
 */
export function resolveNotificationRoute(payload: NotificationPayload): Href {
  const action = (payload.actionUrl ?? "").trim();
  const type = payload.type ?? "";

  // Support FIRST: a support push may also carry an orderId (the ticket's
  // order), but it should open the chat, not the delivery screen.
  // `/support/<threadId>` → the support chat thread.
  const supportMatch = /^\/support\/([\w-]+)$/.exec(action);
  if (supportMatch || payload.threadId || type === "support") {
    const threadId = payload.threadId ?? supportMatch?.[1];
    return threadId
      ? { pathname: "/inbox/support_chat", params: { threadId } }
      : "/inbox";
  }

  // A NEW dispatch is just an OFFER the rider hasn't accepted yet — it must open
  // the MAP, where the offer shows in the bottom sheet with Accept/Decline. The
  // delivery_route (live navigation, "Picked Up") screen is ONLY for an order
  // the rider has already accepted, so we must NOT deep-link there for an offer
  // — even though the payload carries the orderId. This takes priority over the
  // orderId → delivery_route deep-link below.
  if (type === "new_order") {
    return "/(tabs)";
  }

  // Order pushes carry the order id in `data` — deep-link straight to the
  // live-navigation screen for that order (these are for an ALREADY-accepted
  // order, e.g. an order_update).
  if (payload.orderId) {
    return {
      pathname: "/orders/delivery_route",
      params: { id: payload.orderId },
    };
  }

  // `/orders/<id>` — order id embedded in the actionUrl (generic notify path).
  const orderMatch = /^\/orders\/([\w-]+)$/.exec(action);
  if (orderMatch && orderMatch[1] !== "delivery_route") {
    return {
      pathname: "/orders/delivery_route",
      params: { id: orderMatch[1] },
    };
  }

  // Order links without a usable id (e.g. backend's `/(tabs)/orders` or a bare
  // order_update) → the Orders tab.
  if (
    action === "/(tabs)/orders" ||
    action === "/orders" ||
    type === "new_order" ||
    type === "order_cancelled" ||
    type === "order_update"
  ) {
    return "/(tabs)";
  }

  // Generic / unknown → the notifications inbox (acceptable fallback only).
  return "/inbox";
}
