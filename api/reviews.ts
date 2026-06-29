import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { Envelope, Review, ReviewSummary } from "./types";

const unwrap = <T>(env: Envelope<T>): T => {
  if (!env || env.success === false) throw new Error(env?.message ?? "Request failed");
  return (env.data ?? (undefined as unknown as T));
};

export type ReviewsQuery = {
  page?: number;
  limit?: number;
  rating?: 1 | 2 | 3 | 4 | 5;
};

export type ReviewsListResult = {
  items: Review[];
  meta: { total: number; page?: number; limit?: number };
};

export const reviewsApi = {
  async summary(): Promise<ReviewSummary> {
    const env = (await apiClient.get(ENDPOINTS.reviews.summary)) as Envelope<ReviewSummary>;
    return unwrap(env);
  },

  async list(query: ReviewsQuery = {}): Promise<ReviewsListResult> {
    const env = (await apiClient.get(ENDPOINTS.reviews.list, { params: query })) as Envelope<
      Review[]
    > & { meta?: { total?: number; page?: number; limit?: number } };
    const items = unwrap(env);
    return {
      items,
      meta: {
        total: Number(env.meta?.total ?? items.length),
        page: env.meta?.page,
        limit: env.meta?.limit,
      },
    };
  },
};
