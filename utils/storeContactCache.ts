/** Store phone from the dispatch offer socket — survives accept + list refetch. */
const storePhonesByOrderId = new Map<string, string>();

export function cacheStorePhone(
  orderId: string,
  phone: string | null | undefined,
): void {
  const trimmed = phone?.trim();
  if (trimmed) storePhonesByOrderId.set(orderId, trimmed);
}

export function getCachedStorePhone(orderId: string): string | undefined {
  return storePhonesByOrderId.get(orderId);
}

export function clearCachedStorePhone(orderId: string): void {
  storePhonesByOrderId.delete(orderId);
}
