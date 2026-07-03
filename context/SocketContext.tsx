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
import { AppState, Platform, Vibration } from "react-native";
import {
  SOCKET_URL,
  apiClient,
  ENDPOINTS,
  ordersApi,
  type OrderAssignment,
  type SocketNewOrderPayload,
  type SocketNotificationNewPayload,
  type SocketOrderCancelledPayload,
  type SocketOrderUpdatePayload,
} from "@/api";
import { useAuth } from "./AuthContext";
import { resolveAlertSound } from "@/utils/alertSounds";
import {
  getCachedNotificationSoundUri,
  syncNotificationSound,
} from "@/utils/notificationSound";
import { cacheStorePhone } from "@/utils/storeContactCache";

/**
 * Map the admin-configured 0-100 vibration strength to one buzz. iOS has no
 * public amplitude API → Light/Medium/Heavy haptics; Android approximates
 * strength via vibration duration (no public amplitude API in RN/Expo — a true
 * 0-255 amplitude would need a small native module). 0 = no vibration.
 */
function buzzOnce(level: number): void {
  if (!level || level <= 0) return;
  const clamped = Math.max(1, Math.min(100, level));
  if (Platform.OS === "android") {
    Vibration.vibrate(Math.round(80 + (clamped / 100) * 320)); // ~80–400ms
    return;
  }
  const style =
    clamped < 40
      ? Haptics.ImpactFeedbackStyle.Light
      : clamped < 75
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Heavy;
  void Haptics.impactAsync(style).catch(() => {});
}

type SocketContextValue = {
  socket: Socket | null;
  isConnected: boolean;
  newOrder: SocketNewOrderPayload | null;
  cancelledOrder: SocketOrderCancelledPayload | null;
  orderUpdate: SocketOrderUpdatePayload | null;
  pushedNotification: SocketNotificationNewPayload | null;
  clearNewOrder: () => void;
  clearCancelledOrder: () => void;
  clearOrderUpdate: () => void;
  clearPushedNotification: () => void;
  joinSupportTicket: (ticketId: string) => void;
  leaveSupportTicket: (ticketId: string) => void;
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
  const [orderUpdate, setOrderUpdate] = useState<SocketOrderUpdatePayload | null>(null);
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
  // Local file URI of the dashboard-managed alarm sound (downloaded + cached by
  // utils/notificationSound). null → use the bundled preset for alarmSoundKey.
  const remoteSoundUriRef = useRef<string | null>(null);
  // Admin-configured (dashboard) alarm volume 0-100 and vibration strength 0-100.
  const alertVolumeRef = useRef<number>(100);
  const alertVibrationRef = useRef<number>(60);

  // Build the looping player once; rebuild only when the admin changes the sound.
  const ensureAlarmPlayer = useCallback((): AudioPlayer | null => {
    const remoteUri = remoteSoundUriRef.current;
    const key = alarmSoundKeyRef.current;
    // Admin-configured volume (0-100 → 0-1), applied on reuse + create so a
    // dashboard change takes effect on the next ring.
    const vol = Math.max(0, Math.min(1, (alertVolumeRef.current ?? 100) / 100));
    const buildKey = remoteUri
      ? `remote:${remoteUri}`
      : `preset:${key ?? "default"}`;
    if (alarmPlayerRef.current && builtSoundKeyRef.current === buildKey) {
      try {
        alarmPlayerRef.current.volume = vol;
      } catch {}
      return alarmPlayerRef.current;
    }
    try {
      alarmPlayerRef.current?.remove();
    } catch (e) {
      console.warn("alarm: failed to remove old player", e);
    }
    try {
      const p = createAudioPlayer(
        remoteUri ? { uri: remoteUri } : resolveAlertSound(key),
      );
      p.loop = true;
      try {
        p.volume = vol;
      } catch {}
      alarmPlayerRef.current = p;
      builtSoundKeyRef.current = buildKey;
      return p;
    } catch (e) {
      console.warn("alarm: failed to create player", e);
      if (remoteUri) {
        // Custom sound unplayable — fall back to the bundled preset.
        remoteSoundUriRef.current = null;
        try {
          const p = createAudioPlayer(resolveAlertSound(key));
          p.loop = true;
          try {
            p.volume = vol;
          } catch {}
          alarmPlayerRef.current = p;
          builtSoundKeyRef.current = `preset:${key ?? "default"}`;
          return p;
        } catch (e2) {
          console.warn("alarm: fallback player failed", e2);
        }
      }
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
      // Pause AND release the native player — a paused instance could still be
      // resumed by a surviving pump tick or a rebuilt effect; releasing makes
      // silence unconditional. The next alarm rebuilds a fresh player.
      alarmPlayerRef.current?.pause();
      alarmPlayerRef.current?.remove();
    } catch (e) {
      console.warn("alarm: stop failed", e);
    }
    alarmPlayerRef.current = null;
    builtSoundKeyRef.current = undefined;
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
      const level = alertVibrationRef.current;
      if (level > 0) {
        buzzOnce(level);
        if (vibrateTimerRef.current) clearInterval(vibrateTimerRef.current);
        vibrateTimerRef.current = setInterval(() => buzzOnce(level), 1500);
      }
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

      // The asset loads asynchronously. expo-audio flips `playing` to true the
      // instant play() is called — even while the source is still buffering and
      // NOT decoded (isLoaded:false, duration:NaN) — which produces a silent
      // "playing" state. So we must gate on `isLoaded`, not `playing`: keep
      // re-issuing play() (and seekTo(0), which only takes once the source is
      // loaded) until the player is genuinely loaded AND playing. Give up ~2s in.
      if (playRetryRef.current) clearTimeout(playRetryRef.current);
      let attempts = 0;
      const ready = () => p.isLoaded && p.playing;
      const pump = () => {
        if (alarmPlayerRef.current !== p) return; // stopped or rebuilt meanwhile
        try {
          // Reset to the start each tick so a previously played/paused alarm
          // restarts; harmless to repeat and only effective once loaded.
          // seekTo is async and rejects on an unloaded source — swallow it.
          void p.seekTo(0)?.catch(() => { });
          p.play();
        } catch (e) {
          console.warn("alarm: play() threw", e);
        }
        attempts += 1;
        if (!ready() && attempts < 16) {
          playRetryRef.current = setTimeout(pump, 120);
        } else if (!ready() && builtSoundKeyRef.current?.startsWith("remote:")) {
          // The downloaded custom sound never loaded (corrupt / unsupported
          // file) — rebuild with the bundled preset and ring with that.
          remoteSoundUriRef.current = null;
          const fallback = ensureAlarmPlayer();
          if (fallback && fallback !== p) {
            let fbAttempts = 0;
            const fbReady = () => fallback.isLoaded && fallback.playing;
            const fbPump = () => {
              if (alarmPlayerRef.current !== fallback) return;
              try {
                void fallback.seekTo(0)?.catch(() => { });
                fallback.play();
              } catch (e2) {
                console.warn("alarm: fallback play failed", e2);
              }
              fbAttempts += 1;
              if (!fbReady() && fbAttempts < 16) {
                playRetryRef.current = setTimeout(fbPump, 120);
              }
            };
            fbPump();
          }
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
    const fetchAlertSound = async () => {
      try {
        const env = (await apiClient.get(ENDPOINTS.auth.profile)) as {
          data?: { alertSound?: string; alertVolume?: number; vibration?: number };
        };
        if (!cancelled && env?.data) {
          if (env.data.alertSound) alarmSoundKeyRef.current = env.data.alertSound;
          if (typeof env.data.alertVolume === "number")
            alertVolumeRef.current = env.data.alertVolume;
          if (typeof env.data.vibration === "number")
            alertVibrationRef.current = env.data.vibration;
        }
      } catch {
        // keep the default sound
      }
    };
    void fetchAlertSound();
    // Re-fetch the sound key on foreground so an admin's dashboard change
    // applies on the next resume, not only after a full cold restart.
    const soundSub = AppState.addEventListener("change", (s) => {
      if (s === "active") void fetchAlertSound();
    });
    // Dashboard-managed custom alarm file: use the cached copy immediately (so
    // the very first alarm already plays it), then refresh from the backend —
    // downloads when the admin changed it, null/404/error → bundled preset.
    void (async () => {
      const cachedUri = await getCachedNotificationSoundUri();
      if (!cancelled && cachedUri) remoteSoundUriRef.current = cachedUri;
      const freshUri = await syncNotificationSound();
      if (!cancelled) remoteSoundUriRef.current = freshUri;
    })();
    return () => {
      cancelled = true;
      soundSub.remove();
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
      cacheStorePhone(payload.orderId, payload.store?.phone);
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

    s.on("order:update", (payload: SocketOrderUpdatePayload) => {
      setOrderUpdate(payload);
    });

    s.on("notification:new", (payload: SocketNotificationNewPayload) => {
      setPushedNotification(payload);
      if (payload.type === "new_order" && driver?.isOnline) {
        void startAlarmRef.current();
      }
    });

    setSocket(s);

    return () => {
      s.removeAllListeners();
      s.disconnect();
      stopAlarmRef.current();
    };
  }, [isAuthenticated, driver?.id, driver?.isOnline]);

  // Foreground push fallback: socket can be down while FCM still delivers.
  useEffect(() => {
    if (!isAuthenticated || !driver?.isOnline) return;
    let sub: { remove: () => void } | undefined;
    let cancelled = false;
    void (async () => {
      try {
        const Notifications = await import("expo-notifications");
        if (cancelled) return;
        sub = Notifications.addNotificationReceivedListener((notif) => {
          if (AppState.currentState !== "active") return;
          const content = notif?.request?.content;
          const data = (content?.data ?? {}) as Record<string, unknown>;
          const type =
            typeof data.type === "string" ? data.type : undefined;
          if (type !== "new_order") return;
          setPushedNotification({
            id:
              typeof data.notificationId === "string"
                ? data.notificationId
                : String(Date.now()),
            type: "new_order",
            title: content?.title ?? "",
            body: content?.body ?? "",
            data,
            actionUrl:
              typeof data.actionUrl === "string" ? data.actionUrl : null,
          });
          void startAlarmRef.current();
        });
      } catch {
        // expo-notifications unavailable — poll/socket covers it.
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [isAuthenticated, driver?.isOnline]);

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

  // ── Poll fallback: ring for offers the socket missed ─────────────────────
  // If the 'new-order' event is lost (socket down, expired session at connect
  // time, app just resumed), the assignment still appears in GET /driver/orders
  // as status 'assigned'. Poll while online and synthesize the offer card +
  // alarm for any assigned row we haven't announced yet. First pass seeds
  // silently so app-launch doesn't re-ring for an offer already on screen.
  const announcedOfferIdsRef = useRef<Set<string>>(new Set());
  const offerPollSeededRef = useRef(false);
  const newOrderRef = useRef<SocketNewOrderPayload | null>(null);
  newOrderRef.current = newOrder;
  useEffect(() => {
    if (!isAuthenticated || !driver?.isOnline) return;
    let cancelled = false;
    const checkAssigned = async () => {
      let list: OrderAssignment[];
      try {
        list = await ordersApi.list();
      } catch {
        return; // network/auth hiccup — next tick retries
      }
      if (cancelled) return;
      const assigned = list.filter((a) => a.status === "assigned");
      // If the offer on screen is no longer 'assigned' to us (accepted from
      // the Orders tab, expired, or taken by re-dispatch), clear + silence it
      // — covers every accept path that bypasses the offer card.
      const current = newOrderRef.current;
      if (current && !assigned.some((a) => a.orderId === current.orderId)) {
        stopAlarm();
        setNewOrder(null);
      }
      if (!offerPollSeededRef.current) {
        offerPollSeededRef.current = true;
        assigned.forEach((a) => announcedOfferIdsRef.current.add(a.orderId));
        return;
      }
      for (const a of assigned) {
        if (announcedOfferIdsRef.current.has(a.orderId)) continue;
        announcedOfferIdsRef.current.add(a.orderId);
        if (newOrderRef.current) continue; // an offer is already ringing
        const assignedAtMs = a.assignedAt ? Date.parse(a.assignedAt) : NaN;
        const elapsed = Number.isFinite(assignedAtMs)
          ? Math.floor((Date.now() - assignedAtMs) / 1000)
          : 0;
        const expiresInSeconds = Math.max(5, 60 - elapsed);
        const store = a.order?.store;
        if (!store?.geoLocation) continue; // not enough data for the card
        setNewOrder({
          orderId: a.orderId,
          orderNumber: a.order?.orderNumber ?? "",
          store: {
            id: store.id,
            name: store.name,
            logoUrl: store.avatar ?? null,
            address: store.address ?? "",
            location: store.geoLocation,
          },
          customer: a.order?.deliveryAddress
            ? { address: [a.order.deliveryAddress.building, a.order.deliveryAddress.street].filter(Boolean).join(", "), location: a.order.deliveryAddress.geoLocation }
            : undefined,
          items: [],
          total: a.order?.total ?? 0,
          currency: a.order?.currency ?? "IQD",
          distanceKm: a.distanceKm ?? 0,
          estimatedMinutes: a.estimatedMinutes ?? 0,
          expiresInSeconds,
        });
        void startAlarmRef.current();
        break;
      }
    };
    void checkAssigned();
    const id = setInterval(checkAssigned, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAuthenticated, driver?.isOnline, stopAlarm]);

  // Backgrounding stops the in-app loop; resume re-rings if an offer is still live.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (st !== "active") {
        stopAlarm();
      } else if (newOrderRef.current && driver?.isOnline) {
        void startAlarmRef.current();
      }
    });
    return () => sub.remove();
  }, [stopAlarm, driver?.isOnline]);

  // Acknowledging an order (accept/decline) clears it and silences the alarm.
  const clearNewOrder = useCallback(() => {
    stopAlarm();
    setNewOrder(null);
  }, [stopAlarm]);
  const clearCancelledOrder = useCallback(() => setCancelledOrder(null), []);
  const clearOrderUpdate = useCallback(() => setOrderUpdate(null), []);
  const clearPushedNotification = useCallback(() => setPushedNotification(null), []);

  const joinSupportTicket = useCallback(
    (ticketId: string) => {
      socket?.emit("support:join_ticket", { ticketId });
    },
    [socket],
  );

  const leaveSupportTicket = useCallback(
    (ticketId: string) => {
      socket?.emit("support:leave_ticket", { ticketId });
    },
    [socket],
  );

  const value = useMemo<SocketContextValue>(
    () => ({
      socket,
      isConnected,
      newOrder,
      cancelledOrder,
      orderUpdate,
      pushedNotification,
      clearNewOrder,
      clearCancelledOrder,
      clearOrderUpdate,
      clearPushedNotification,
      joinSupportTicket,
      leaveSupportTicket,
      stopAlarm,
    }),
    [
      socket,
      isConnected,
      newOrder,
      cancelledOrder,
      orderUpdate,
      pushedNotification,
      clearNewOrder,
      clearCancelledOrder,
      clearOrderUpdate,
      clearPushedNotification,
      joinSupportTicket,
      leaveSupportTicket,
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
