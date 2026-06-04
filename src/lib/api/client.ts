import { API_BASE_URL } from '../config';
import { tokenStorage } from '../tokenStorage';

/** Error carrying the HTTP status and parsed DRF error body. */
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Lets the React layer react to a hard auth failure (refresh exhausted) without
// the framework-agnostic client importing React or the router.
const UNAUTHORIZED_EVENT = 'vidora:unauthorized';
export const onUnauthorized = (cb: () => void) => {
  window.addEventListener(UNAUTHORIZED_EVENT, cb);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, cb);
};

interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Attach the bearer token and transparently refresh it on 401. */
  auth?: boolean;
  /** Plain JSON-serializable body. */
  body?: unknown;
}

function buildHeaders(extra: HeadersInit | undefined, token: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Pull a human-readable message out of a DRF error payload. */
function messageFromBody(data: unknown, status: number): string {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === 'string') return obj.detail;
    const firstKey = Object.keys(obj)[0];
    const firstVal = firstKey ? obj[firstKey] : undefined;
    if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') return firstVal[0];
    if (typeof firstVal === 'string') return firstVal;
  }
  return `Request failed (${status})`;
}

// Single-flight refresh: concurrent 401s share one refresh round-trip.
let refreshInFlight: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return null;

  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await parseBody(res)) as { access?: string } | null;
        if (!data?.access) return null;
        tokenStorage.set(data.access);
        return data.access;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

/** Core request helper. Throws {@link ApiError} on non-2xx. */
export async function apiFetch<T = unknown>(
  path: string,
  { auth = false, body, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const payload = body !== undefined ? JSON.stringify(body) : undefined;

  const doFetch = (token: string | null) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: buildHeaders(headers, token),
      body: payload,
    });

  let res = await doFetch(auth ? tokenStorage.getAccess() : null);

  if (res.status === 401 && auth) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      res = await doFetch(newAccess);
    }
    if (res.status === 401) {
      tokenStorage.clear();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
  }

  if (!res.ok) {
    const data = await parseBody(res);
    throw new ApiError(messageFromBody(data, res.status), res.status, data);
  }

  return parseBody(res) as Promise<T>;
}
