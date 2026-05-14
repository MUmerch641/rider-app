export const ENDPOINTS = {
  auth: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    profile: "/auth/profile",
    updateProfile: "/auth/profile",
    deleteAccount: "/auth/profile",
    forgotPassword: "/auth/forgot-password",
    verifyOtp: "/auth/verify-otp",
    resendOtp: "/auth/resend-otp",
    resetPassword: "/auth/reset-password",
  },
  driver: {
    status: "/status",
    location: "/location",
  },
  orders: {
    list: "/orders",
    byId: (id: string) => `/orders/${id}`,
    accept: (id: string) => `/orders/${id}/accept`,
    reject: (id: string) => `/orders/${id}/reject`,
    status: (id: string) => `/orders/${id}/status`,
  },
  wallet: {
    summary: "/wallet/summary",
    balance: "/wallet/balance",
    history: "/wallet/history",
    payouts: "/wallet/payouts",
  },
  notifications: {
    list: "/notifications",
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: "/notifications/read-all",
    clear: "/notifications",
  },
  reviews: {
    summary: "/reviews/summary",
    list: "/reviews",
  },
  support: {
    threads: "/support/threads",
    threadById: (id: string) => `/support/threads/${id}`,
    messages: (threadId: string) => `/support/threads/${threadId}/messages`,
  },
} as const;
