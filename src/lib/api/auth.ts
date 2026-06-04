import type { LoginResponse, User } from '../types';
import { apiFetch } from './client';

/** Thin, typed wrapper over the backend's /api/auth endpoints. */
export const authApi = {
  register: (email: string, password: string, displayName?: string) =>
    apiFetch<{ detail: string; email: string }>('/auth/register/', {
      method: 'POST',
      body: { email, password, display_name: displayName },
    }),

  verifyEmail: (email: string, code: string) =>
    apiFetch<{ detail: string }>('/auth/verify-email/', {
      method: 'POST',
      body: { email, code },
    }),

  login: (email: string, password: string) =>
    apiFetch<LoginResponse>('/auth/login/', {
      method: 'POST',
      body: { email, password },
    }),

  me: () => apiFetch<User>('/auth/me/', { auth: true }),

  forgotPassword: (email: string) =>
    apiFetch<{ detail: string }>('/auth/password/forgot/', {
      method: 'POST',
      body: { email },
    }),

  verifyResetCode: (email: string, code: string) =>
    apiFetch<{ reset_token: string }>('/auth/password/verify/', {
      method: 'POST',
      body: { email, code },
    }),

  resetPassword: (resetToken: string, newPassword: string) =>
    apiFetch<{ detail: string }>('/auth/password/reset/', {
      method: 'POST',
      body: { reset_token: resetToken, new_password: newPassword },
    }),
};
