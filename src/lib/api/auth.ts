import type { LoginResponse, User } from '../types';
import { apiFetch, ApiError, refreshAccessToken } from './client';
import { API_BASE_URL } from '../config';
import { tokenStorage } from '../tokenStorage';

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

  updateProfile: (displayName: string) =>
    apiFetch<User>('/auth/me/', { method: 'PATCH', auth: true, body: { display_name: displayName } }),

  updateAvatar: async (file: File): Promise<User> => {
    const send = (token: string | null) => {
      const form = new FormData();
      form.append('avatar', file);
      return fetch(`${API_BASE_URL}/auth/me/`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
    };

    let res = await send(tokenStorage.getAccess());
    if (res.status === 401) {
      const newAccess = await refreshAccessToken();
      if (newAccess) res = await send(newAccess);
    }

    if (!res.ok) {
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        /* ignore */
      }
      throw new ApiError(`Avatar update failed (${res.status})`, res.status, data);
    }
    return res.json() as Promise<User>;
  },

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<{ detail: string }>('/auth/me/password/', {
      method: 'POST',
      auth: true,
      body: { current_password: currentPassword, new_password: newPassword },
    }),

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
