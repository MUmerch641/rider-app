import type { OrderAssignment, SelectedAddon } from "@/api/types";
import { localizeName, type LangKey } from "@/utils/localize";
import { getCachedStorePhone, cacheStorePhone } from "@/utils/storeContactCache";

export type SummaryItem = {
  name?: unknown;
  quantity?: number;
  price?: number;
  image?: string | null;
  variants?: string;
  notes?: string | null;
};

export type AcceptSummaryPayload = {
  orderNumber?: string;
  store?: { name?: unknown; phone?: string | null; address?: unknown };
  customer?: { name?: string; phone?: string | null; address?: string };
  items?: SummaryItem[];
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

/** True when store/customer phones or line items are still missing from a list row. */
export function summaryNeedsDetailFetch(payload: AcceptSummaryPayload): boolean {
  return (
    !summaryHasItems(payload) ||
    !payload.store?.phone?.trim() ||
    !payload.customer?.phone?.trim()
  );
}

export function assignmentNeedsDetailFetch(assignment: OrderAssignment): boolean {
  if (assignment.status === "assigned") return false;
  return summaryNeedsDetailFetch(assignmentToSummaryPayload(assignment));
}

/** Flatten selected addon options into a readable variant string. */
export function itemVariantLabel(
  selectedAddons: SelectedAddon[] | null | undefined,
  langKey: LangKey = "en",
): string {
  if (!selectedAddons?.length) return "";
  const labels: string[] = [];
  for (const addon of selectedAddons) {
    for (const opt of addon.selectedOptions ?? []) {
      const label = itemDisplayName(opt.optionName, langKey);
      if (label) labels.push(label);
    }
  }
  return labels.join(", ");
}

function orderItemToSummaryRow(
  it: NonNullable<OrderAssignment["order"]["orderItems"]>[number],
  langKey: LangKey,
): SummaryItem | null {
  const rawName =
    it.itemSnapshot?.name ??
    it.storeItem?.name ??
    (it as { name?: unknown }).name ??
    (it as { itemName?: unknown }).itemName;
  if (itemDisplayName(rawName, langKey).length === 0) return null;

  return {
    name: rawName,
    quantity: it.quantity,
    price: Number(it.unitPrice ?? it.itemSnapshot?.price ?? it.storeItem?.price ?? 0),
    image:
      it.itemSnapshot?.photo ??
      it.storeItem?.image ??
      (it.storeItem?.photos as string[] | undefined)?.[0] ??
      null,
    variants: itemVariantLabel(it.selectedAddons, langKey) || undefined,
    notes: it.notes ?? it.specialInstructions ?? null,
  };
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
    .map((it) => orderItemToSummaryRow(it, langKey))
    .filter((it): it is SummaryItem => it != null);

  return {
    orderNumber: order?.orderNumber,
    store: {
      name: order?.store?.name,
      phone:
        order?.store?.phone?.trim() ||
        getCachedStorePhone(assignment.orderId) ||
        undefined,
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
  items: { quantity?: number; name?: unknown; price?: string | number; image?: string | null }[] = [],
): AcceptSummaryPayload["items"] {
  return items.map((it) => ({
    name: it.name,
    quantity: it.quantity ?? 1,
    price: Number(it.price ?? 0),
    image: it.image ?? null,
  }));
}

/**
 * GET /driver/orders may omit orderItems and store phone; fetch per-order
 * details for in-progress assignments that are still missing contact or items.
 */
export async function enrichAssignmentsWithOrderItems(
  assignments: OrderAssignment[],
  fetchById: (orderId: string) => Promise<OrderAssignment>,
): Promise<OrderAssignment[]> {
  const targets = assignments.filter((a) => assignmentNeedsDetailFetch(a));
  if (targets.length === 0) return assignments;

  const patches = await Promise.all(
    targets.map(async (a) => {
      try {
        const detail = await fetchById(a.orderId);
        cacheStorePhone(detail.orderId, detail.order?.store?.phone);
        return { orderId: a.orderId, assignment: detail };
      } catch {
        return null;
      }
    }),
  );

  const detailByOrderId = new Map(
    patches
      .filter((p): p is { orderId: string; assignment: OrderAssignment } => p != null)
      .map((p) => [p.orderId, p.assignment]),
  );
  if (detailByOrderId.size === 0) return assignments;

  return assignments.map((a) => detailByOrderId.get(a.orderId) ?? a);
}
