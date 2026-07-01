// Centralized API types for the rider app.
// Backend wraps every response in `Envelope<T>`; domain methods unwrap `.data`.

export type Envelope<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
  meta?: PaginationMeta;
  timestamp?: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type Translatable = string | { en?: string; ar?: string; ku?: string };

export type GeoPoint = { lat: number; lng: number };

export type DeviceInfo = {
  deviceId?: string;
  deviceName?: string;
  deviceType?: "ios" | "android" | "web";
};

// ─── Auth ────────────────────────────────────────────────────────────
export type LoginRequest = { phone: string; password: string } & DeviceInfo;

export type LoginResponse = {
  driver: Driver;
  accessToken: string;
  refreshToken: string;
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

export type Driver = {
  id: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  vehicleType?: "bike" | "motor" | "scooter" | "car" | null;
  vehiclePlate?: string | null;
  isOnline?: boolean;
  isAvailable?: boolean;
  rating?: string | number | null;
  totalDeliveries?: number;
  orderRadiusKm?: number | null;
  dateOfBirth?: string | null;
  fcmToken?: string | null;
  currentLocation?: GeoPoint | null;
  zoneId?: string | null;
  cityId?: string | null;
  countryId?: string | null;
  isActive?: boolean;
  lastLogin?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ProfileUpdateRequest = Partial<{
  firstName: string;
  lastName: string;
  nickname: string;
  dateOfBirth: string;
  avatar: string;
  fcmToken: string;
  orderRadiusKm: number;
}>;

export type ForgotPasswordRequest = {
  contact: string;
  channel: "email" | "phone";
};

export type ForgotPasswordResponse = {
  contactMasked: string;
  expiresIn: number;
};

export type VerifyOtpRequest = { contact: string; code: string };

export type VerifyOtpResponse = { resetToken: string };

export type ResetPasswordRequest = {
  resetToken: string;
  newPassword: string;
};

/** Authenticated change-password (profile flow, not the OTP reset flow). */
export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

/** POST /upload (driver-scoped) — file stored in MinIO. */
export type UploadResponse = {
  url: string;
  thumbnailUrl?: string;
  filename?: string;
  size?: number;
  mimeType?: string;
};

/** GET /settings/notification-sound — dashboard-managed alarm sound. */
export type NotificationSoundResponse = {
  url: string | null;
};

// ─── Driver status / location ────────────────────────────────────────
export type StatusUpdateRequest = { isOnline: boolean };

/** An offline-buffered GPS point, replayed via `LocationUpdateRequest.queued`. */
export type QueuedLocationPoint = {
  lat: number;
  lng: number;
  heading?: number;
  /** ISO 8601 datetime the point was recorded at. */
  recordedAt: string;
};

export type LocationUpdateRequest = {
  lat: number;
  lng: number;
  heading?: number;
  /** ISO 8601 datetime — the server defaults to now() when omitted. */
  recordedAt?: string;
  /** Older offline-buffered points (max 100) — written to history only. */
  queued?: QueuedLocationPoint[];
};

// ─── Orders ──────────────────────────────────────────────────────────
export type DriverAssignmentStatus =
  | "assigned"
  | "accepted"
  | "rejected"
  | "arrived_store"
  | "picked_up"
  | "on_the_way"
  | "arrived"
  | "delivered"
  | "cancelled"
  | "reassigned";

export type RejectReason =
  | "too_far"
  | "busy"
  | "vehicle_issue"
  | "personal_emergency"
  | "order_too_large"
  | "bad_weather"
  | "timeout"
  | "other";

export type DriverNextStatus =
  | "arrived_store"
  | "picked_up"
  | "on_the_way"
  | "arrived"
  | "delivered";

export type SelectedAddonOption = {
  optionId?: string;
  optionName?: Translatable;
  price?: number;
};

export type SelectedAddon = {
  addonId?: string;
  addonName?: Translatable;
  selectedOptions?: SelectedAddonOption[];
};

export type OrderItemSnapshot = {
  name: Translatable;
  price?: number;
  photo?: string | null;
};

export type OrderItem = {
  id: string;
  quantity: number;
  unitPrice: string | number;
  notes?: string | null;
  itemSnapshot?: OrderItemSnapshot;
  selectedAddons?: SelectedAddon[] | null;
  specialInstructions?: string | null;
  storeItem?: {
    id: string;
    name: Translatable;
    description?: Translatable;
    price?: string | number;
    image?: string | null;
    photos?: string[] | null;
  } | null;
};

export type Store = {
  id: string;
  name: Translatable;
  address?: string | null;
  avatar?: string | null;
  geoLocation?: GeoPoint;
  phone?: string | null;
};

export type Customer = {
  id?: string;
  name?: string;
  phone?: string | null;
  avatar?: string | null;
};

export type Order = {
  id: string;
  orderNumber: string;
  userId: string;
  storeId: string;
  // Global order status (e.g. driver_assigned, picked_up, on_the_way, arrived,
  // delivered). Returned by the driver order-details endpoint; used to derive
  // the pickup-vs-dropoff phase on the route screen.
  status?: string;
  total?: string | number;
  currency?: string;
  paymentMethod?: "CASH" | "CARD" | "ONLINE";
  // ISO 8601 datetime the merchant expects the order to be ready for pickup.
  // Returned by the driver order list + getById endpoints; drives the prep
  // countdown ring on the map's active-order overlay.
  estimatedReadyAt?: string | null;
  // Set when the merchant marks the order ready — drives the "Ready" badge on
  // the prep countdown ring even if estimatedReadyAt is still in the future.
  readyAt?: string | null;
  deliveryAddress?: {
    street?: string;
    building?: string;
    floor?: string;
    apartment?: string;
    instructions?: string;
    geoLocation?: GeoPoint;
  };
  store?: Store;
  customer?: Customer;
  orderItems?: OrderItem[];
};

export type OrderAssignment = {
  id: string;
  orderId: string;
  driverId: string;
  status: DriverAssignmentStatus;
  rejectionReason?: RejectReason | null;
  distanceKm?: string | number | null;
  estimatedMinutes?: string | number | null;
  baseFee?: string | number | null;
  distanceBonus?: string | number | null;
  tipAmount?: string | number | null;
  totalEarnings?: string | number | null;
  assignedAt?: string;
  respondedAt?: string | null;
  arrivedStoreAt?: string | null;
  pickedUpAt?: string | null;
  arrivedAt?: string | null;
  deliveredAt?: string | null;
  order: Order;
};

export type RejectOrderRequest = { reason: RejectReason };
// lat/lng are required by the backend for the range-gated transitions
// (picked_up, arrived, delivered + legacy arrived_store) — see
// utils/orderStatusGps.ts.
export type UpdateOrderStatusRequest = {
  status: DriverNextStatus;
  lat?: number;
  lng?: number;
};

// Driver asks an admin to cancel/reassign an accepted delivery. Preset reason
// keys must match the backend's DRIVER_CANCEL_REQUEST_REASONS.
export type CancelRequestReason =
  | "too_far"
  | "vehicle_issue"
  | "customer_unreachable"
  | "store_closed"
  | "other";
export type CancelRequestBody = { reason: CancelRequestReason; note?: string };

// ─── Wallet ──────────────────────────────────────────────────────────
export type WalletSummary = {
  period: { start: string; end: string };
  summary: {
    totalEarnings: string | number;
    baseFees: string | number;
    distanceBonuses: string | number;
    tips: string | number;
    deliveryCount: number;
    acceptanceRate?: number;
    onTimeRate?: number;
    rating?: number;
  };
  series?: { date: string; earnings: string | number; count: number }[];
};

export type WalletBalance = {
  available: string | number;
  pending: string | number;
  lifetime: string | number;
  currency: string;
};

export type WalletHistoryEntry = {
  id: string;
  orderId: string;
  orderNumber: string;
  totalEarnings: string | number;
  baseFee: string | number;
  distanceBonus: string | number;
  tipAmount: string | number;
  distanceKm: string | number;
  deliveredAt: string;
};

export type Payout = {
  id: string;
  driverId: string;
  periodStart: string;
  periodEnd: string;
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  totalDistanceKm: string | number;
  baseFees: string | number;
  distanceBonuses: string | number;
  tips: string | number;
  incentives: string | number;
  deductions: string | number;
  netAmount: string | number;
  status: "pending" | "processing" | "paid" | "failed";
  transactionReference?: string | null;
  paidAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Notifications ───────────────────────────────────────────────────
export type DriverNotificationType =
  | "new_order"
  | "order_cancelled"
  | "order_update"
  | "system_alert"
  | "support";

export type DriverNotification = {
  id: string;
  type: DriverNotificationType | string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  // Backend-stored deep-link hint (e.g. `/orders/<id>`, `/support/<ticketId>`).
  // Resolved to a real in-app route via utils/notificationRoutes — never used raw.
  actionUrl?: string | null;
  isRead: boolean;
  createdAt: string;
};

// ─── Reviews ─────────────────────────────────────────────────────────
export type ReviewSummary = {
  averageRating: number;
  totalReviews: number;
  breakdown: { 5: number; 4: number; 3: number; 2: number; 1: number };
};

export type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  customer?: { id: string; name: string; avatar?: string | null };
  orderId?: string | null;
  createdAt: string;
};

// ─── Support ─────────────────────────────────────────────────────────
export type SupportThread = {
  id: string;
  title?: string | null;
  status: "open" | "closed";
  lastMessageAt?: string | null;
  // Preview text of the most recent message — shown under the title in the
  // Inbox tab's chat list. Null when the thread has no messages yet.
  lastMessageBody?: string | null;
  unreadCount?: number;
  orderId?: string | null;
};

export type SupportMessage = {
  id: string;
  threadId: string;
  body: string;
  attachmentUrl?: string | null;
  senderType: "driver" | "support";
  seen: boolean;
  createdAt: string;
};

// ─── Socket payloads (server → driver) ───────────────────────────────
export type SocketNewOrderPayload = {
  orderId: string;
  orderNumber: string;
  store: {
    id: string;
    name: Translatable;
    logoUrl?: string | null;
    address?: string;
    location: GeoPoint;
    phone?: string | null;
  };
  customer?: { name?: string; phone?: string; address?: string; location?: GeoPoint };
  items: { id: string; quantity: number; name: Translatable; price: string | number }[];
  total: string | number;
  currency: string;
  distanceKm: string | number;
  estimatedMinutes: string | number;
  expiresInSeconds: number;
};

export type SocketOrderCancelledPayload = {
  orderId: string;
  orderNumber?: string;
  reason?: string;
};

export type SocketOrderUpdatePayload = {
  orderId: string;
  status?: string;
  orderNumber?: string;
  estimatedReadyAt?: string | null;
  readyAt?: string | null;
  pendingCustomerReview?: boolean;
  updatedAt?: string;
};

export type SocketNotificationNewPayload = DriverNotification;

export type SocketLocationUpdatePayload = {
  orderId: string;
  orderNumber: string;
  location: GeoPoint;
  heading?: number;
  distanceMeters?: number | null;
  updatedAt: string;
};
