import type { OrderAssignment } from "@/api/types";
import { localizeName, type LangKey } from "@/utils/localize";

export type AcceptSummaryPayload = {
  orderNumber?: string;
  store?: { name?: unknown; phone?: string | null; address?: unknown };
  customer?: { name?: string; phone?: string | null; address?: string };
  items?: { name?: unknown; quantity?: number; price?: number }[];
  total?: number;
  currency?: string;
};

export function itemDisplayName(
  name: unknown,
  langKey: LangKey = "en",
): string {
  if (!name) return "";
  if (typeof name === "string") return name.trim();
  return localizeName(name, langKey).trim();
}

/** True when at least one line has a readable name. */
export function summaryHasItems(payload: AcceptSummaryPayload): boolean {
  return (payload.items ?? []).some((it) => itemDisplayName(it.name).length > 0);
}

/** Build the accept-summary dialog payload from a server assignment row. */
export function assignmentToSummaryPayload(
  assignment: OrderAssignment,
  langKey: LangKey = "en",
): AcceptSummaryPayload {
  const order = assignment.order;
  const da = order?.deliveryAddress;
  const dropoff = da
    ? ([da.building, da.street, da.floor, da.apartment].filter(
        Boolean,
      ) as string[]).join(", ")
    : undefined;

  const items = (order?.orderItems ?? [])
    .map((it) => {
      const rawName =
        it.storeItem?.name ??
        (it as { name?: unknown }).name ??
        (it as { itemName?: unknown }).itemName;
      return {
        name: rawName,
        quantity: it.quantity,
        price: Number(it.unitPrice ?? it.storeItem?.price ?? 0),
      };
    })
    .filter((it) => itemDisplayName(it.name, langKey).length > 0);

  return {
    orderNumber: order?.orderNumber,
    store: {
      name: order?.store?.name,
      phone: order?.store?.phone ?? undefined,
      address: order?.store?.address ?? undefined,
    },
    customer: {
      name: order?.customer?.name,
      phone: order?.customer?.phone ?? undefined,
      address: dropoff,
    },
    items,
    total: Number(order?.total ?? 0),
    currency: order?.currency,
  };
}

/** Normalize socket-offer items into summary rows. */
export function socketItemsToSummary(
  items: { quantity?: number; name?: unknown; price?: string | number }[] = [],
): AcceptSummaryPayload["items"] {
  return items.map((it) => ({
    name: it.name,
    quantity: it.quantity ?? 1,
    price: Number(it.price ?? 0),
  }));
}
