import { API_BASE_URL } from '../config';
import { tokenStorage } from '../tokenStorage';
import { apiFetch, ApiError, refreshAccessToken } from './client';

/** A cloned voice (VoiceSync AI), trained from an uploaded audio sample. */
export interface Voice {
  id: string;
  name: string;
  status: 'pending' | 'ready' | 'failed';
  provider: string;
  sample_url: string;
  error: string;
  created_at: string;
}

/** A built-in ElevenLabs stock voice — ready to use for TTS without cloning. */
export interface StockVoice {
  id: string;
  name: string;
  description: string;
  preview_url: string;
  gender: string;
  age: string;
}

/** A resolved voice choice for TTS — either a user's clone or a stock voice. */
export interface VoiceSelection {
  kind: 'cloned' | 'stock';
  id: string;
  name: string;
}

export const voiceApi = {
  list: () => apiFetch<Voice[]>('/studio/voices/', { auth: true }),
  listStock: () => apiFetch<StockVoice[]>('/studio/voices/stock/', { auth: true }),
  rename: (id: string, name: string) =>
    apiFetch<Voice>(`/studio/voices/${id}/`, { method: 'PATCH', auth: true, body: { name } }),
  remove: (id: string) =>
    apiFetch<null>(`/studio/voices/${id}/`, { method: 'DELETE', auth: true }),
};

/**
 * Clone a voice from an audio sample (multipart). Like uploadAsset, this can't
 * use the JSON-only apiFetch — we send FormData and let the browser set the
 * multipart boundary. Mirrors the single-flight 401 → refresh → retry behavior.
 */
export async function cloneVoice(name: string, sample: File): Promise<Voice> {
  const send = (token: string | null) => {
    const form = new FormData();
    form.append('name', name);
    form.append('sample', sample);
    return fetch(`${API_BASE_URL}/studio/voices/`, {
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
    throw new ApiError(`Voice clone failed (${res.status})`, res.status, data);
  }
  return res.json() as Promise<Voice>;
}
