import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "./config";
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

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    if (error.response?.status === 401 && onUnauthorized) {
      try {
        await onUnauthorized();
      } catch {
        // swallow — handler is best-effort
      }
    }
    const data = error.response?.data;
    const message = data?.message ?? error.message ?? "Network error";
    const enriched = new Error(message) as Error & {
      status?: number;
      fields?: Record<string, string[]>;
      raw?: unknown;
    };
    enriched.status = error.response?.status;
    enriched.fields = data?.errors;
    enriched.raw = data;
    return Promise.reject(enriched);
  },
);

export type ApiError = Error & {
  status?: number;
  fields?: Record<string, string[]>;
  raw?: unknown;
};
