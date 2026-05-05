import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { DriverNotification, Envelope } from "./types";

const unwrap = <T>(env: Envelope<T>): T => {
  if (!env || env.success === false) throw new Error(env?.message ?? "Request failed");
  return (env.data ?? (undefined as unknown as T));
};

export type NotificationsQuery = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
};

export const notificationsApi = {
  async list(query: NotificationsQuery = {}): Promise<DriverNotification[]> {
    const env = (await apiClient.get(ENDPOINTS.notifications.list, { params: query })) as Envelope<DriverNotification[]>;
    return unwrap(env);
  },

  async markRead(id: string): Promise<void> {
    const env = (await apiClient.patch(ENDPOINTS.notifications.markRead(id))) as Envelope<unknown>;
    if (env && env.success === false) throw new Error(env.message ?? "Mark-read failed");
  },

  async markAllRead(): Promise<void> {
    const env = (await apiClient.patch(ENDPOINTS.notifications.markAllRead)) as Envelope<unknown>;
    if (env && env.success === false) throw new Error(env.message ?? "Mark-all-read failed");
  },

  async clearAll(): Promise<void> {
    const env = (await apiClient.delete(ENDPOINTS.notifications.clear)) as Envelope<unknown>;
    if (env && env.success === false) throw new Error(env.message ?? "Clear failed");
  },
};
