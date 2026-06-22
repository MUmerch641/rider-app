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
 * Resolve a driver notification to a navigable route, or null when nothing in
 * the payload is routable (cold start must NOT fall back to the inbox).
 */
export function resolveNotificationRoute(
  payload: NotificationPayload,
): Href | null {
  const action = (payload.actionUrl ?? "").trim();
  const type = payload.type ?? "";

  // Support FIRST: a support push may also carry an orderId (the ticket's
  // order), but it should open the chat, not the delivery screen.
  const supportMatch = /^\/support\/([\w-]+)$/.exec(action);
  if (supportMatch || payload.threadId || type === "support") {
    const threadId = payload.threadId ?? supportMatch?.[1];
    return threadId
      ? { pathname: "/inbox/support_chat", params: { threadId } }
      : "/inbox";
  }

  // A NEW dispatch is just an OFFER the rider hasn't accepted yet — open the map.
  if (type === "new_order") {
    return "/(tabs)/onmap";
  }

  // Order pushes → the map where accepted / offered orders live.
  if (payload.orderId) {
    return "/(tabs)/onmap";
  }

  const orderMatch = /^\/orders\/([\w-]+)$/.exec(action);
  if (orderMatch && orderMatch[1] !== "delivery_route") {
    return "/(tabs)/onmap";
  }

  if (
    action === "/(tabs)/orders" ||
    action === "/orders" ||
    type === "order_cancelled" ||
    type === "order_update"
  ) {
    return "/(tabs)/onmap";
  }

  return null;
}
