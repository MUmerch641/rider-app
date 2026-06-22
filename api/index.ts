export { apiClient, setUnauthorizedHandler } from "./client";
export type { ApiError } from "./client";
export { ENDPOINTS } from "./endpoints";
export { API_BASE_URL, SOCKET_URL, REQUEST_TIMEOUT_MS } from "./config";

export { authApi } from "./auth";
export { uploadApi } from "./upload";
export { ordersApi } from "./orders";
export { walletApi, type WalletSummaryQuery, type WalletHistoryQuery } from "./wallet";
export { notificationsApi, type NotificationsQuery } from "./notifications";
export { reviewsApi, type ReviewsQuery } from "./reviews";
export { supportApi, type CreateThreadRequest, type SendMessageRequest } from "./support";

export type {
  // primitives
  Envelope,
  PaginationMeta,
  Translatable,
  GeoPoint,
  DeviceInfo,
  // auth
  Driver,
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  ProfileUpdateRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  ResetPasswordRequest,
  ChangePasswordRequest,
  UploadResponse,
  NotificationSoundResponse,
  StatusUpdateRequest,
  LocationUpdateRequest,
  QueuedLocationPoint,
  // orders
  Order,
  OrderItem,
  OrderAssignment,
  Store,
  Customer,
  DriverAssignmentStatus,
  DriverNextStatus,
  RejectReason,
  RejectOrderRequest,
  UpdateOrderStatusRequest,
  // wallet
  WalletSummary,
  WalletBalance,
  WalletHistoryEntry,
  Payout,
  // notifications
  DriverNotification,
  DriverNotificationType,
  // reviews
  Review,
  ReviewSummary,
  // support
  SupportThread,
  SupportMessage,
  // socket payloads
  SocketNewOrderPayload,
  SocketOrderCancelledPayload,
  SocketOrderUpdatePayload,
  SocketNotificationNewPayload,
  SocketLocationUpdatePayload,
} from "./types";
