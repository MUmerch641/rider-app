import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";
import {
  SOCKET_URL,
  type SocketNewOrderPayload,
  type SocketNotificationNewPayload,
  type SocketOrderCancelledPayload,
} from "@/api";
import { useAuth } from "./AuthContext";

type SocketContextValue = {
  socket: Socket | null;
  isConnected: boolean;
  newOrder: SocketNewOrderPayload | null;
  cancelledOrder: SocketOrderCancelledPayload | null;
  pushedNotification: SocketNotificationNewPayload | null;
  clearNewOrder: () => void;
  clearCancelledOrder: () => void;
  clearPushedNotification: () => void;
};

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { driver, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [newOrder, setNewOrder] = useState<SocketNewOrderPayload | null>(null);
  const [cancelledOrder, setCancelledOrder] = useState<SocketOrderCancelledPayload | null>(null);
  const [pushedNotification, setPushedNotification] =
    useState<SocketNotificationNewPayload | null>(null);

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
    });

    s.on("order:cancelled", (payload: SocketOrderCancelledPayload) => {
      setCancelledOrder(payload);
      setNewOrder((curr) => (curr && curr.orderId === payload.orderId ? null : curr));
    });

    s.on("notification:new", (payload: SocketNotificationNewPayload) => {
      setPushedNotification(payload);
    });

    setSocket(s);

    return () => {
      s.removeAllListeners();
      s.disconnect();
    };
  }, [isAuthenticated, driver?.id]);

  const clearNewOrder = useCallback(() => setNewOrder(null), []);
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
    ],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
}
