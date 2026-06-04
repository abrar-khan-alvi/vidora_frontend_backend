/**
 * The single place that touches persisted auth tokens. Components and the API
 * client go through this — never localStorage directly.
 */
const ACCESS_KEY = 'vidora.access';
const REFRESH_KEY = 'vidora.refresh';

export const tokenStorage = {
  getAccess: (): string | null => localStorage.getItem(ACCESS_KEY),
  getRefresh: (): string | null => localStorage.getItem(REFRESH_KEY),

  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh !== undefined) localStorage.setItem(REFRESH_KEY, refresh);
  },

  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
