import { API_BASE_URL } from '../config';
import { tokenStorage } from '../tokenStorage';
import { apiFetch, ApiError, refreshAccessToken } from './client';

export interface UploadedAsset {
  id: string;
  name: string;
  type: string;
  source: string;
  url: string;
  width: number | null;
  height: number | null;
  created_at: string;
}

export const studioApi = {
  /** The user's reusable photo library (uploaded images). */
  listReferences: () => apiFetch<UploadedAsset[]>('/studio/references/', { auth: true }),
  rename: (id: string, name: string) =>
    apiFetch<UploadedAsset>(`/studio/assets/${id}/`, { method: 'PATCH', auth: true, body: { name } }),
  remove: (id: string) =>
    apiFetch<null>(`/studio/assets/${id}/`, { method: 'DELETE', auth: true }),
};

/** A trained reference ("SoulId") created from one or more library photos. */
export interface TrainedReference {
  id: string;
  name: string;
  status: 'pending' | 'ready' | 'failed';
  thumbnail_url: string;
  error: string;
  created_at: string;
}

export const referenceApi = {
  list: () => apiFetch<TrainedReference[]>('/studio/characters/', { auth: true }),
  create: (name: string, asset_ids: string[]) =>
    apiFetch<TrainedReference>('/studio/characters/', { method: 'POST', auth: true, body: { name, asset_ids } }),
  remove: (id: string) =>
    apiFetch<null>(`/studio/characters/${id}/`, { method: 'DELETE', auth: true }),
};

/**
 * Upload a single image file (multipart) and return the stored Asset.
 *
 * Kept separate from `apiFetch` because that helper is JSON-only; here we send
 * FormData and must NOT set Content-Type (the browser adds the boundary).
 * Mirrors apiFetch's single-flight 401 → refresh → retry behavior.
 */
export async function uploadAsset(file: File): Promise<UploadedAsset> {
  const send = (token: string | null) => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${API_BASE_URL}/studio/assets/`, {
      method: 'POST',
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
    throw new ApiError(`Upload failed (${res.status})`, res.status, data);
  }
  return res.json() as Promise<UploadedAsset>;
}
