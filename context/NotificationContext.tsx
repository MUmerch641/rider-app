import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { storage } from "@/utils/storage";
import type { DriverNotification } from "@/api";

const STORAGE_KEY = "onway_driver_notifications";
const MAX_LOCAL = 200;

type AddInput =
  | DriverNotification
  | (Omit<DriverNotification, "id" | "isRead" | "createdAt"> &
      Partial<Pick<DriverNotification, "id" | "isRead" | "createdAt">>);

type NotificationContextValue = {
  notifications: DriverNotification[];
  unreadCount: number;
  addNotification: (n: AddInput) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  setNotifications: (next: DriverNotification[]) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotificationsState] = useState<DriverNotification[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await storage.get(STORAGE_KEY);
      if (raw) {
        try {
          setNotificationsState(JSON.parse(raw));
        } catch {
          // corrupt storage — start fresh
        }
      }
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    storage.set(STORAGE_KEY, JSON.stringify(notifications)).catch(() => undefined);
  }, [notifications, hydrated]);

  const addNotification = useCallback((n: AddInput) => {
    setNotificationsState((prev) => {
      const next: DriverNotification = {
        id: n.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        isRead: n.isRead ?? false,
        createdAt: n.createdAt ?? new Date().toISOString(),
      };
      // Dedupe by id if a server-issued notification arrives twice.
      const filtered = prev.filter((p) => p.id !== next.id);
      return [next, ...filtered].slice(0, MAX_LOCAL);
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotificationsState((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotificationsState((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const clearAll = useCallback(() => setNotificationsState([]), []);

  const setNotifications = useCallback((next: DriverNotification[]) => {
    setNotificationsState(next.slice(0, MAX_LOCAL));
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearAll,
      setNotifications,
    }),
    [notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll, setNotifications],
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
