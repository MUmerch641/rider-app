import Constants from "expo-constants";

const env = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const PROD_API = "https://api.onwayiraq.com/api/v1/driver";
const PROD_SOCKET = "https://api.onwayiraq.com";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? env.EXPO_PUBLIC_API_URL ?? PROD_API;

export const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ?? env.EXPO_PUBLIC_SOCKET_URL ?? PROD_SOCKET;

export const REQUEST_TIMEOUT_MS = 15000;
