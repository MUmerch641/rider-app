import type { ApiError } from "@/api";
import i18n from "@/constants/i18n";

/**
 * Map coded backend rejections from the GPS-gated status-advance endpoint
 * (PATCH /driver/orders/:id/status) to translated, rider-friendly messages.
 *
 * The backend (controllers/driver/order.controller.ts) surfaces these codes
 * in the validation-errors map:
 *   { code: ["OUT_OF_RANGE"], distance: ["1234"], threshold: ["200"] }
 * which api/client.ts exposes as `ApiError.fields`.
 *
 * Unknown / un-coded failures fall back to the raw backend message so nothing
 * is ever swallowed.
 */
export function translateOrderStatusError(err: unknown): string {
  const apiErr = err as ApiError | null | undefined;
  const code = apiErr?.fields?.code?.[0];

  if (code === "GPS_REQUIRED") {
    return i18n.t("orderStatusErrors.gpsRequired");
  }

  if (code === "OUT_OF_RANGE") {
    const distance = Math.round(Number(apiErr?.fields?.distance?.[0]));
    const threshold = Math.round(Number(apiErr?.fields?.threshold?.[0]));
    if (Number.isFinite(distance) && Number.isFinite(threshold)) {
      return i18n.t("orderStatusErrors.outOfRange", { distance, threshold });
    }
    return i18n.t("orderStatusErrors.outOfRangeGeneric");
  }

  return apiErr?.message || i18n.t("orderStatusErrors.updateFailed");
}
