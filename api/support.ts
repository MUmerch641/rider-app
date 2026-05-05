import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { Envelope, SupportMessage, SupportThread } from "./types";

const unwrap = <T>(env: Envelope<T>): T => {
  if (!env || env.success === false) throw new Error(env?.message ?? "Request failed");
  return (env.data ?? (undefined as unknown as T));
};

export type CreateThreadRequest = { orderId?: string; subject?: string };

export type SendMessageRequest = { body: string; attachmentUrl?: string };

export const supportApi = {
  async listThreads(): Promise<SupportThread[]> {
    const env = (await apiClient.get(ENDPOINTS.support.threads)) as Envelope<SupportThread[]>;
    return unwrap(env);
  },

  async createThread(body: CreateThreadRequest = {}): Promise<SupportThread> {
    const env = (await apiClient.post(ENDPOINTS.support.threads, body)) as Envelope<SupportThread>;
    return unwrap(env);
  },

  async listMessages(threadId: string, page = 1, limit = 30): Promise<SupportMessage[]> {
    const env = (await apiClient.get(ENDPOINTS.support.messages(threadId), {
      params: { page, limit },
    })) as Envelope<SupportMessage[]>;
    return unwrap(env);
  },

  async sendMessage(threadId: string, body: SendMessageRequest): Promise<SupportMessage> {
    const env = (await apiClient.post(ENDPOINTS.support.messages(threadId), body)) as Envelope<SupportMessage>;
    return unwrap(env);
  },
};
