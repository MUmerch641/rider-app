import * as Device from "expo-device";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import {
  authApi,
  setUnauthorizedHandler,
  type Driver,
  type LocationUpdateRequest,
  type LoginRequest,
  type ProfileUpdateRequest,
} from "@/api";
import {
  clearLocationQueue,
  stopDriverTracking,
} from "@/utils/locationTracking";
import {
  configurePushHandler,
  registerForPushNotifications,
  setupNotificationTapHandling,
} from "@/utils/pushToken";
import { clearAllAuth, driverStorage, tokenStorage } from "@/utils/storage";

type AuthContextValue = {
  driver: Driver | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { phone: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<Driver | null>;
  updateProfile: (body: ProfileUpdateRequest) => Promise<Driver>;
  updateStatus: (isOnline: boolean) => Promise<void>;
  updateLocation: (body: LocationUpdateRequest) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const buildDeviceInfo = () => {
  const platform = Platform.OS;
  const deviceType: "ios" | "android" | "web" | undefined =
    platform === "ios" || platform === "android" || platform === "web" ? platform : undefined;
  return {
    deviceId: Device.osInternalBuildId ?? Device.modelId ?? undefined,
    deviceName: Device.deviceName ?? Device.modelName ?? undefined,
    deviceType,
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLoggingOutRef = useRef(false);

  const persistDriver = useCallback(async (next: Driver | null) => {
    setDriver(next);
    if (next) await driverStorage.set(next);
    else await driverStorage.clear();
  }, []);

  const handleUnauthorized = useCallback(async () => {
    const refresh = await tokenStorage.getRefreshToken();
    if (!refresh) {
      await clearAllAuth();
      setDriver(null);
      return;
    }
    try {
      const res = await authApi.refresh(refresh);
      await tokenStorage.setAccessToken(res.accessToken);
      await tokenStorage.setRefreshToken(res.refreshToken);
    } catch (e) {
      // Only END the session on a genuine auth rejection (refresh token
      // invalid/expired → 401/403). A transient failure — no network, timeout,
      // or a 5xx — must NOT log the rider out (that was kicking riders out on
      // flaky data / on resume from background). Keep the session; the next
      // request retries the refresh.
      const status = (e as { status?: number })?.status;
      if (status === 401 || status === 403) {
        await clearAllAuth();
        setDriver(null);
      }
    }
  }, []);

  useEffect(() => {
    configurePushHandler();
    // Tapping a push must deep-link straight to its target (order → live route,
    // support → chat) instead of dumping the rider on the inbox list.
    setupNotificationTapHandling();
    let cancelled = false;
    (async () => {
      const [stored, accessToken] = await Promise.all([
        driverStorage.get(),
        tokenStorage.getAccessToken(),
      ]);
      if (cancelled) return;
      if (stored && accessToken) setDriver(stored);
      setIsLoading(false);
    })();
    setUnauthorizedHandler(handleUnauthorized);
    return () => {
      cancelled = true;
      setUnauthorizedHandler(null);
    };
  }, [handleUnauthorized]);

  // After authentication, register for FCM push and persist the token on the driver.
  useEffect(() => {
    if (!driver?.id) return;
    let cancelled = false;
    (async () => {
      const token = await registerForPushNotifications();
      if (cancelled || !token) return;
      // Skip if we already pushed the same token recently.
      if (driver.fcmToken === token) return;
      try {
        await authApi.updateProfile({ fcmToken: token });
        const refreshed = await authApi.getProfile().catch(() => null);
        if (refreshed && !cancelled) {
          await driverStorage.set(refreshed);
          setDriver(refreshed);
        }
      } catch {
        // Best-effort — silent failure.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [driver?.id, driver?.fcmToken]);

  const login = useCallback(async ({ phone, password }: { phone: string; password: string }) => {
    const body: LoginRequest = { phone, password, ...buildDeviceInfo() };
    const res = await authApi.login(body);
    await Promise.all([
      tokenStorage.setAccessToken(res.accessToken),
      tokenStorage.setRefreshToken(res.refreshToken),
      driverStorage.set(res.driver),
    ]);
    setDriver(res.driver);
  }, []);

  const logout = useCallback(async () => {
    // Single-shot: concurrent calls (sign-out button + a racing 401 handler)
    // each flipped state and churned renders on the login screen.
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    try {
      // Optimistic logout (bug #1): tell the server in the background (best-effort)
      // and clear local auth + driver state immediately so the app returns to the
      // login screen at once. Previously this awaited authApi.logout() first, so a
      // slow/hanging request (or the 401→refresh retry) made logout take ~10s.
      void authApi.logout().catch(() => {
        // best-effort; the session is already cleared locally
      });
      // Stop GPS streaming, then drop any offline-buffered points so they can't
      // be flushed under a different account on this device.
      void stopDriverTracking()
        .then(() => clearLocationQueue())
        .catch(() => undefined);
      setDriver(null);
      await clearAllAuth();
    } finally {
      isLoggingOutRef.current = false;
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<Driver | null> => {
    try {
      const next = await authApi.getProfile();
      await persistDriver(next);
      return next;
    } catch {
      return null;
    }
  }, [persistDriver]);

  const updateProfile = useCallback(
    async (body: ProfileUpdateRequest): Promise<Driver> => {
      const next = await authApi.updateProfile(body);
      await persistDriver(next);
      return next;
    },
    [persistDriver],
  );

  const updateStatus = useCallback(
    async (isOnline: boolean) => {
      await authApi.updateStatus({ isOnline });
      if (driver) await persistDriver({ ...driver, isOnline, isAvailable: isOnline });
    },
    [driver, persistDriver],
  );

  const updateLocation = useCallback(async (body: LocationUpdateRequest) => {
    await authApi.updateLocation(body);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      driver,
      isLoading,
      isAuthenticated: driver !== null,
      login,
      logout,
      refreshProfile,
      updateProfile,
      updateStatus,
      updateLocation,
    }),
    [driver, isLoading, login, logout, refreshProfile, updateProfile, updateStatus, updateLocation],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
