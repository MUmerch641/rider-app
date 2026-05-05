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

// ─── Driver status / location ────────────────────────────────────────
export type StatusUpdateRequest = { isOnline: boolean };
export type LocationUpdateRequest = { lat: number; lng: number; heading?: number };

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

export type OrderItem = {
  id: string;
  quantity: number;
  unitPrice: string | number;
  specialInstructions?: string | null;
  storeItem?: {
    id: string;
    name: Translatable;
    description?: Translatable;
    price?: string | number;
    image?: string | null;
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
  total?: string | number;
  currency?: string;
  paymentMethod?: "CASH" | "CARD" | "ONLINE";
  deliveryAddress?: {
    street?: string;
    building?: string;
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
export type UpdateOrderStatusRequest = { status: DriverNextStatus };

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
  };
  customer?: { name?: string; address?: string; location?: GeoPoint };
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

export type SocketNotificationNewPayload = DriverNotification;

export type SocketLocationUpdatePayload = {
  orderId: string;
  orderNumber: string;
  location: GeoPoint;
  heading?: number;
  updatedAt: string;
};
