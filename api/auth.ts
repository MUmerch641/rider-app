import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type {
  Driver,
  Envelope,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LocationUpdateRequest,
  LoginRequest,
  LoginResponse,
  ProfileUpdateRequest,
  RefreshResponse,
  ResetPasswordRequest,
  StatusUpdateRequest,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from "./types";

const unwrap = <T>(env: Envelope<T>): T => {
  if (!env || env.success === false) {
    throw new Error(env?.message ?? "Request failed");
  }
  return (env.data ?? (undefined as unknown as T));
};

export const authApi = {
  async login(body: LoginRequest): Promise<LoginResponse> {
    const env = (await apiClient.post(ENDPOINTS.auth.login, body)) as Envelope<LoginResponse>;
    return unwrap(env);
  },

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const env = (await apiClient.post(ENDPOINTS.auth.refresh, { refreshToken })) as Envelope<RefreshResponse>;
    return unwrap(env);
  },

  async logout(): Promise<void> {
    const env = (await apiClient.post(ENDPOINTS.auth.logout)) as Envelope<unknown>;
    if (env && env.success === false) throw new Error(env.message ?? "Logout failed");
  },

  async getProfile(): Promise<Driver> {
    const env = (await apiClient.get(ENDPOINTS.auth.profile)) as Envelope<Driver>;
    return unwrap(env);
  },

  async updateProfile(body: ProfileUpdateRequest): Promise<Driver> {
    const env = (await apiClient.patch(ENDPOINTS.auth.updateProfile, body)) as Envelope<Driver>;
    return unwrap(env);
  },

  async deleteAccount(): Promise<void> {
    const env = (await apiClient.delete(ENDPOINTS.auth.deleteAccount)) as Envelope<unknown>;
    if (env && env.success === false) throw new Error(env.message ?? "Failed to delete account");
  },

  async forgotPassword(body: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    const env = (await apiClient.post(ENDPOINTS.auth.forgotPassword, body)) as Envelope<ForgotPasswordResponse>;
    return unwrap(env);
  },

  async verifyOtp(body: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    const env = (await apiClient.post(ENDPOINTS.auth.verifyOtp, body)) as Envelope<VerifyOtpResponse>;
    return unwrap(env);
  },

  async resendOtp(contact: string): Promise<void> {
    const env = (await apiClient.post(ENDPOINTS.auth.resendOtp, { contact })) as Envelope<unknown>;
    if (env && env.success === false) throw new Error(env.message ?? "Resend failed");
  },

  async resetPassword(body: ResetPasswordRequest): Promise<void> {
    const env = (await apiClient.post(ENDPOINTS.auth.resetPassword, body)) as Envelope<unknown>;
    if (env && env.success === false) throw new Error(env.message ?? "Reset failed");
  },

  async updateStatus(body: StatusUpdateRequest): Promise<void> {
    const env = (await apiClient.patch(ENDPOINTS.driver.status, body)) as Envelope<unknown>;
    if (env && env.success === false) throw new Error(env.message ?? "Status update failed");
  },

  async updateLocation(body: LocationUpdateRequest): Promise<void> {
    const env = (await apiClient.patch(ENDPOINTS.driver.location, body)) as Envelope<unknown>;
    if (env && env.success === false) throw new Error(env.message ?? "Location update failed");
  },
};
