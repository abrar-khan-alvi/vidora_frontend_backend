import { API_BASE_URL } from '../config';
import { tokenStorage } from '../tokenStorage';
import { apiFetch, refreshAccessToken } from './client';

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface PromptonMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: PromptonMessage[];
}

export const promptonApi = {
  list: () => apiFetch<ConversationSummary[]>('/prompton/conversations/', { auth: true }),
  create: () =>
    apiFetch<ConversationSummary>('/prompton/conversations/', {
      method: 'POST',
      auth: true,
      body: {},
    }),
  get: (id: string) =>
    apiFetch<ConversationDetail>(`/prompton/conversations/${id}/`, { auth: true }),
  remove: (id: string) =>
    apiFetch<void>(`/prompton/conversations/${id}/`, { method: 'DELETE', auth: true }),
};

interface StreamHandlers {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
  signal?: AbortSignal;
}

/**
 * POST a message and consume the SSE stream. We use fetch (not EventSource) so
 * we can send the Authorization header and reuse the JWT refresh path.
 */
export async function streamMessage(
  conversationId: string,
  content: string,
  handlers: StreamHandlers,
): Promise<void> {
  const url = `${API_BASE_URL}/prompton/conversations/${conversationId}/stream/`;

  const doFetch = (token: string | null) =>
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content }),
      signal: handlers.signal,
    });

  try {
    let res = await doFetch(tokenStorage.getAccess());
    if (res.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) res = await doFetch(refreshed);
    }

    if (!res.ok || !res.body) {
      handlers.onError(`Request failed (${res.status})`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? ''; // keep the trailing partial frame
      for (const frame of frames) {
        const line = frame.trim();
        if (!line.startsWith('data:')) continue;
        try {
          const evt = JSON.parse(line.slice(5).trim());
          if (evt.type === 'delta') handlers.onDelta(evt.text);
          else if (evt.type === 'done') handlers.onDone();
          else if (evt.type === 'error') handlers.onError(evt.message);
        } catch {
          /* ignore malformed frame */
        }
      }
    }
  } catch (err) {
    // Aborting the stream (user pressed Stop) is not an error.
    if (err instanceof DOMException && err.name === 'AbortError') return;
    handlers.onError('Connection interrupted.');
  }
}
