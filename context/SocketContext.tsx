import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";
import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  type AudioPlayer,
} from "expo-audio";
import { Vibration } from "react-native";
import {
  SOCKET_URL,
  apiClient,
  ENDPOINTS,
  type SocketNewOrderPayload,
  type SocketNotificationNewPayload,
  type SocketOrderCancelledPayload,
} from "@/api";
import { useAuth } from "./AuthContext";
import { resolveAlertSound } from "@/utils/alertSounds";

type SocketContextValue = {
  socket: Socket | null;
  isConnected: boolean;
  newOrder: SocketNewOrderPayload | null;
  cancelledOrder: SocketOrderCancelledPayload | null;
  pushedNotification: SocketNotificationNewPayload | null;
  clearNewOrder: () => void;
  clearCancelledOrder: () => void;
  clearPushedNotification: () => void;
  /** Silence the incoming-order alarm (sound + vibration). */
  stopAlarm: () => void;
};

const SocketContext = createContext<SocketContextValue | null>(null);

// A new dispatch is offered for ~60s before it's reassigned, so cap the alarm at
// that long even if the driver never opens the app — never ring forever.
const ALARM_MAX_MS = 60_000;

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { driver, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [newOrder, setNewOrder] = useState<SocketNewOrderPayload | null>(null);
  const [cancelledOrder, setCancelledOrder] = useState<SocketOrderCancelledPayload | null>(null);
  const [pushedNotification, setPushedNotification] =
    useState<SocketNotificationNewPayload | null>(null);

  // ── Incoming-order alarm (sound + vibration until acknowledged) ─────────────
  // The driver's chosen alert sound is admin-configurable; until that setting is
  // fetched we play the "default" preset. Recreating the player per order avoids
  // the "only the first order rings" bug, and the vibration is driven on an
  // interval because iOS ignores Vibration patterns / the repeat flag.
  const alarmPlayerRef = useRef<AudioPlayer | null>(null);
  const vibrateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alarmStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alarmSoundKeyRef = useRef<string | undefined>(undefined);

  const stopAlarm = useCallback(() => {
    try {
      // Just pause — startAlarm recreates the player for the next order, so don't
      // seekTo() here. The old code's unawaited async seekTo(0) was still pending
      // when the next order's remove() tore the player down, corrupting the iOS
      // audio session so the next alarm went silent.
      alarmPlayerRef.current?.pause();
    } catch {
      // ignore
    }
    if (vibrateTimerRef.current) {
      clearInterval(vibrateTimerRef.current);
      vibrateTimerRef.current = null;
    }
    if (alarmStopRef.current) {
      clearTimeout(alarmStopRef.current);
      alarmStopRef.current = null;
    }
    Vibration.cancel();
  }, []);

  const startAlarm = useCallback(async () => {
    // ── Vibration + safety timer FIRST, in their own try ─────────────────────
    // Never let an audio error skip these (that caused "no sound AND no vibrate").
    try {
      Vibration.vibrate(800);
      if (vibrateTimerRef.current) clearInterval(vibrateTimerRef.current);
      vibrateTimerRef.current = setInterval(() => Vibration.vibrate(800), 1300);
      // Safety auto-stop so it never rings forever if the driver ignores it.
      if (alarmStopRef.current) clearTimeout(alarmStopRef.current);
      alarmStopRef.current = setTimeout(() => stopAlarm(), ALARM_MAX_MS);
    } catch {
      // ignore — audio below is independent
    }

    // ── Audio, isolated so a failure can't kill the vibration ────────────────
    try {
      // The PREVIOUS bug: these two calls were fire-and-forget, so the 2nd+ order
      // called play() before the iOS audio session was (re)configured/active — a
      // prior stopAlarm leaves it stale — and playback silently no-op'd. AWAIT them
      // so the session is ready every time.
      //   1. category that rings even on silent (job alert the driver can't miss)
      //   2. re-activate the session (a prior stop can deactivate it)
      await setAudioModeAsync({ playsInSilentMode: true });
      await setIsAudioActiveAsync(true);
      try {
        alarmPlayerRef.current?.remove();
      } catch {
        // ignore
      }
      const p = createAudioPlayer(resolveAlertSound(alarmSoundKeyRef.current));
      p.loop = true;
      alarmPlayerRef.current = p;
      // createAudioPlayer loads the bundled asset asynchronously — play now AND
      // shortly after so an immediate (pre-load) play() that no-ops still rings.
      const tryPlay = () => {
        try {
          p.play();
        } catch {
          // ignore
        }
      };
      tryPlay();
      setTimeout(tryPlay, 250);
    } catch (err) {
      console.warn("incoming-order alarm audio failed to start", err);
    }
  }, [stopAlarm]);

  const startAlarmRef = useRef(startAlarm);
  startAlarmRef.current = startAlarm;
  const stopAlarmRef = useRef(stopAlarm);
  stopAlarmRef.current = stopAlarm;

  // Pull the admin-configured new-order alert sound (set in the dashboard) so the
  // alarm plays the chosen preset. Falls back to the bundled default on failure.
  useEffect(() => {
    if (!isAuthenticated || !driver?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const env = (await apiClient.get(ENDPOINTS.auth.profile)) as {
          data?: { alertSound?: string };
        };
        if (!cancelled && env?.data?.alertSound) {
          alarmSoundKeyRef.current = env.data.alertSound;
        }
      } catch {
        // keep the default sound
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, driver?.id]);

  useEffect(() => {
    if (!isAuthenticated || !driver?.id) {
      setSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      setIsConnected(false);
      return;
    }

    const s = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    s.on("connect", () => {
      s.emit("authenticate", { userId: driver.id, userType: "driver" });
    });

    s.on("authenticated", (payload: { success?: boolean } | undefined) => {
      if (payload?.success === false) {
        s.disconnect();
        setIsConnected(false);
      } else {
        setIsConnected(true);
      }
    });

    s.on("disconnect", () => setIsConnected(false));

    s.on("new-order", (payload: SocketNewOrderPayload) => {
      setNewOrder(payload);
      void startAlarmRef.current();
    });

    s.on("order:cancelled", (payload: SocketOrderCancelledPayload) => {
      setCancelledOrder(payload);
      setNewOrder((curr) => {
        if (curr && curr.orderId === payload.orderId) {
          stopAlarmRef.current();
          return null;
        }
        return curr;
      });
    });

    s.on("notification:new", (payload: SocketNotificationNewPayload) => {
      setPushedNotification(payload);
    });

    setSocket(s);

    return () => {
      s.removeAllListeners();
      s.disconnect();
      stopAlarmRef.current();
    };
  }, [isAuthenticated, driver?.id]);

  // Release the audio player + timers on unmount.
  useEffect(
    () => () => {
      try {
        alarmPlayerRef.current?.remove();
      } catch {
        // ignore
      }
      if (vibrateTimerRef.current) clearInterval(vibrateTimerRef.current);
      if (alarmStopRef.current) clearTimeout(alarmStopRef.current);
      Vibration.cancel();
    },
    [],
  );

  // Acknowledging an order (accept/decline) clears it and silences the alarm.
  const clearNewOrder = useCallback(() => {
    stopAlarm();
    setNewOrder(null);
  }, [stopAlarm]);
  const clearCancelledOrder = useCallback(() => setCancelledOrder(null), []);
  const clearPushedNotification = useCallback(() => setPushedNotification(null), []);

  const value = useMemo<SocketContextValue>(
    () => ({
      socket,
      isConnected,
      newOrder,
      cancelledOrder,
      pushedNotification,
      clearNewOrder,
      clearCancelledOrder,
      clearPushedNotification,
      stopAlarm,
    }),
    [
      socket,
      isConnected,
      newOrder,
      cancelledOrder,
      pushedNotification,
      clearNewOrder,
      clearCancelledOrder,
      clearPushedNotification,
      stopAlarm,
    ],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
}
