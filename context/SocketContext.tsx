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
import * as Haptics from "expo-haptics";
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

  // ── Incoming-order alarm (sound + haptics until acknowledged) ───────────────
  // Works while the app is foreground/active; when fully backgrounded the FCM
  // push (its own sound, via the high-importance "orders" channel) covers it.
  //
  // ONE persistent player, reused across orders — recreating it every order raced
  // its async asset load, which is why playback was unreliable. We seek to 0 and
  // re-assert the audio session each time instead. RN's Vibration is a no-op on
  // modern iOS, so the buzz uses expo-haptics.
  const alarmPlayerRef = useRef<AudioPlayer | null>(null);
  const builtSoundKeyRef = useRef<string | undefined>(undefined);
  const playRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vibrateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alarmStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alarmSoundKeyRef = useRef<string | undefined>(undefined);

  // Build the looping player once; rebuild only when the admin changes the preset.
  const ensureAlarmPlayer = useCallback((): AudioPlayer | null => {
    const key = alarmSoundKeyRef.current;
    if (alarmPlayerRef.current && builtSoundKeyRef.current === key) {
      return alarmPlayerRef.current;
    }
    try {
      alarmPlayerRef.current?.remove();
    } catch (e) {
      console.warn("alarm: failed to remove old player", e);
    }
    try {
      const p = createAudioPlayer(resolveAlertSound(key));
      p.loop = true;
      alarmPlayerRef.current = p;
      builtSoundKeyRef.current = key;
      return p;
    } catch (e) {
      console.warn("alarm: failed to create player", e);
      alarmPlayerRef.current = null;
      return null;
    }
  }, []);

  const stopAlarm = useCallback(() => {
    if (playRetryRef.current) {
      clearTimeout(playRetryRef.current);
      playRetryRef.current = null;
    }
    try {
      // Pause + rewind so the next order starts the siren cleanly.
      alarmPlayerRef.current?.pause();
      alarmPlayerRef.current?.seekTo(0);
    } catch (e) {
      console.warn("alarm: pause failed", e);
    }
    if (vibrateTimerRef.current) {
      clearInterval(vibrateTimerRef.current);
      vibrateTimerRef.current = null;
    }
    if (alarmStopRef.current) {
      clearTimeout(alarmStopRef.current);
      alarmStopRef.current = null;
    }
  }, []);

  const startAlarm = useCallback(async () => {
    // ── Haptics + safety timer FIRST, isolated so an audio error can't skip them.
    try {
      const buzz = () =>
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        ).catch(() => {});
      buzz();
      if (vibrateTimerRef.current) clearInterval(vibrateTimerRef.current);
      vibrateTimerRef.current = setInterval(buzz, 1500);
      // Safety auto-stop so it never rings forever if the driver ignores it.
      if (alarmStopRef.current) clearTimeout(alarmStopRef.current);
      alarmStopRef.current = setTimeout(() => stopAlarm(), ALARM_MAX_MS);
    } catch (e) {
      console.warn("alarm: haptics failed to start", e);
    }

    // ── Sound ─────────────────────────────────────────────────────────────────
    try {
      // Make the iOS session playable BEFORE play(), every time: ring even on
      // silent, and re-activate the session (a prior stop, or a notification
      // sound, can leave it inactive — which silently no-ops play()).
      await setAudioModeAsync({ playsInSilentMode: true });
      await setIsAudioActiveAsync(true);

      const p = ensureAlarmPlayer();
      if (!p) return;

      // expo-audio does NOT auto-reset position — seek to start so a previously
      // played/paused alarm actually restarts instead of sitting at the end.
      try {
        p.seekTo(0);
      } catch (e) {
        console.warn("alarm: seekTo failed", e);
      }

      // The asset loads asynchronously; play() before it's loaded no-ops. Retry
      // until the player reports it's truly playing (or we give up ~2s in).
      if (playRetryRef.current) clearTimeout(playRetryRef.current);
      let attempts = 0;
      const pump = () => {
        if (alarmPlayerRef.current !== p) return; // stopped or rebuilt meanwhile
        try {
          p.play();
        } catch (e) {
          console.warn("alarm: play() threw", e);
        }
        attempts += 1;
        if (!p.playing && attempts < 16) {
          playRetryRef.current = setTimeout(pump, 120);
        }
      };
      pump();
    } catch (err) {
      console.warn("alarm: audio failed to start", err);
    }
  }, [stopAlarm, ensureAlarmPlayer]);

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
      if (playRetryRef.current) clearTimeout(playRetryRef.current);
      try {
        alarmPlayerRef.current?.remove();
      } catch {
        // ignore
      }
      if (vibrateTimerRef.current) clearInterval(vibrateTimerRef.current);
      if (alarmStopRef.current) clearTimeout(alarmStopRef.current);
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
