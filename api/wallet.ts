import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type {
  Envelope,
  Payout,
  WalletBalance,
  WalletHistoryEntry,
  WalletSummary,
} from "./types";

const unwrap = <T>(env: Envelope<T>): T => {
  if (!env || env.success === false) throw new Error(env?.message ?? "Request failed");
  return (env.data ?? (undefined as unknown as T));
};

export type WalletSummaryQuery = {
  startDate?: string;
  endDate?: string;
  groupBy?: "day" | "week" | "month";
};

export type WalletHistoryQuery = {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
};

export const walletApi = {
  async summary(query: WalletSummaryQuery = {}): Promise<WalletSummary> {
    const env = (await apiClient.get(ENDPOINTS.wallet.summary, { params: query })) as Envelope<WalletSummary>;
    return unwrap(env);
  },

  async balance(): Promise<WalletBalance> {
    const env = (await apiClient.get(ENDPOINTS.wallet.balance)) as Envelope<WalletBalance>;
    return unwrap(env);
  },

  async history(query: WalletHistoryQuery = {}): Promise<WalletHistoryEntry[]> {
    const env = (await apiClient.get(ENDPOINTS.wallet.history, { params: query })) as Envelope<WalletHistoryEntry[]>;
    return unwrap(env);
  },

  async payouts(): Promise<Payout[]> {
    const env = (await apiClient.get(ENDPOINTS.wallet.payouts)) as Envelope<Payout[]>;
    return unwrap(env);
  },
};
