import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type {
  CancelRequestBody,
  Envelope,
  OrderAssignment,
  RejectOrderRequest,
  UpdateOrderStatusRequest,
} from "./types";

const unwrap = <T>(env: Envelope<T>): T => {
  if (!env || env.success === false) throw new Error(env?.message ?? "Request failed");
  return (env.data ?? (undefined as unknown as T));
};

export const ordersApi = {
  async list(): Promise<OrderAssignment[]> {
    const env = (await apiClient.get(ENDPOINTS.orders.list)) as Envelope<OrderAssignment[]>;
    return unwrap(env);
  },

  async getById(id: string): Promise<OrderAssignment> {
    const env = (await apiClient.get(ENDPOINTS.orders.byId(id))) as Envelope<OrderAssignment>;
    return unwrap(env);
  },

  async accept(id: string): Promise<void> {
    const env = (await apiClient.post(ENDPOINTS.orders.accept(id))) as Envelope<unknown>;
    if (env && env.success === false) throw new Error(env.message ?? "Accept failed");
  },

  async reject(id: string, body: RejectOrderRequest): Promise<void> {
    const env = (await apiClient.post(ENDPOINTS.orders.reject(id), body)) as Envelope<unknown>;
    if (env && env.success === false) throw new Error(env.message ?? "Reject failed");
  },

  async updateStatus(id: string, body: UpdateOrderStatusRequest): Promise<void> {
    const env = (await apiClient.patch(ENDPOINTS.orders.status(id), body)) as Envelope<unknown>;
    if (env && env.success === false) throw new Error(env.message ?? "Status update failed");
  },

  // Ask an admin to cancel/reassign this delivery (drivers can't self-cancel).
  async requestCancellation(id: string, body: CancelRequestBody): Promise<void> {
    const env = (await apiClient.post(
      ENDPOINTS.orders.cancelRequest(id),
      body,
    )) as Envelope<unknown>;
    if (env && env.success === false)
      throw new Error(env.message ?? "Cancellation request failed");
  },
};
