import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "./config";
import { ENDPOINTS } from "./endpoints";
import { tokenStorage } from "@/utils/storage";

type UnauthorizedHandler = () => void | Promise<void>;
let onUnauthorized: UnauthorizedHandler | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null): void => {
  onUnauthorized = handler;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStorage.getAccessToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export type ApiError = Error & {
  status?: number;
  fields?: Record<string, string[]>;
  raw?: unknown;
};

const enrichError = (
  error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>,
): ApiError => {
  const data = error.response?.data;
  const message = data?.message ?? error.message ?? "Network error";
  const enriched = new Error(message) as ApiError;
  enriched.status = error.response?.status;
  enriched.fields = data?.errors;
  enriched.raw = data;
  return enriched;
};

// ── Token refresh on 401 ────────────────────────────────────────────────────
// A short-lived access token EXPIRING must NOT log the rider out. On the first
// 401 from a non-auth endpoint we refresh the access token with the stored
// refresh token and retry the original request; concurrent 401s queue behind a
// single in-flight refresh. ONLY a failed refresh (or a missing refresh token)
// triggers the global logout handler.
//
// Previously every 401 logged the rider out immediately — that was the
// "randomly logged out after a few minutes on the map / in the background"
// glitch: the access token would expire and the very next request killed the
// session instead of silently refreshing.
let isRefreshing = false;
let pendingQueue: ((token: string | null) => void)[] = [];
const flushQueue = (token: string | null) => {
  const q = pendingQueue;
  pendingQueue = [];
  q.forEach((cb) => cb(token));
};

apiClient.interceptors.response.use(
  (response) => response.data,
  async (
    error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>,
  ) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const reqUrl = original?.url ?? "";
    // A 401 from /auth/* (login, OTP, password reset, refresh) means wrong
    // credentials / an invalid refresh token — NOT an expired session — so we
    // never refresh or fire the global logout for those.
    const isAuthEndpoint = reqUrl.includes("/auth/");
    const status = error.response?.status;

    if (status === 401 && !isAuthEndpoint && original && !original._retry) {
      original._retry = true;

      // A refresh is already in flight — queue this request until it resolves.
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push((token) => {
            if (!token) {
              reject(enrichError(error));
              return;
            }
            original.headers = original.headers ?? {};
            (original.headers as Record<string, string>).Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          });
        });
      }

      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) {
        if (onUnauthorized) {
          try {
            await onUnauthorized();
          } catch {
            /* best-effort */
          }
        }
        return Promise.reject(enrichError(error));
      }

      isRefreshing = true;
      try {
        // `/auth/refresh` is an auth endpoint, so a 401 here won't recurse into
        // this handler — it just throws and we decide below.
        const env = (await apiClient.post(ENDPOINTS.auth.refresh, {
          refreshToken,
        })) as { data?: { accessToken?: string; refreshToken?: string } };
        const accessToken = env?.data?.accessToken;
        const newRefresh = env?.data?.refreshToken;
        if (!accessToken) throw new Error("No access token in refresh response");

        await tokenStorage.setAccessToken(accessToken);
        if (newRefresh) await tokenStorage.setRefreshToken(newRefresh);
        isRefreshing = false;
        flushQueue(accessToken);

        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch (refreshErr) {
        isRefreshing = false;
        flushQueue(null);
        // CRITICAL: only log the rider out when the refresh was genuinely
        // REJECTED (the refresh token is invalid/expired → 401/403). A transient
        // failure — no network (status undefined), timeout, or a 5xx — must NOT
        // end the session: that's what was kicking riders out on flaky mobile
        // data / when resuming from background before the network was ready. On
        // a transient failure we just fail this request; the next one retries.
        const status = (refreshErr as { status?: number })?.status;
        const isAuthRejection = status === 401 || status === 403;
        if (isAuthRejection && onUnauthorized) {
          try {
            await onUnauthorized();
          } catch {
            /* best-effort */
          }
        }
        return Promise.reject(enrichError(error));
      }
    }

    return Promise.reject(enrichError(error));
  },
);
