import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../lib/api/auth';
import { onUnauthorized } from '../lib/api/client';
import { tokenStorage } from '../lib/tokenStorage';
import type { User } from '../lib/types';

interface AuthContextValue {
  user: User | null;
  /** True while the initial "am I logged in?" check runs. */
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Replace the cached user (e.g. after a profile update). */
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Rehydrate the session on first load if a token is present.
  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (!tokenStorage.getAccess()) {
        setInitializing(false);
        return;
      }
      try {
        const me = await authApi.me();
        if (active) setUser(me);
      } catch {
        tokenStorage.clear();
      } finally {
        if (active) setInitializing(false);
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  // The API client clears tokens and fires this when refresh is exhausted.
  useEffect(() => onUnauthorized(() => setUser(null)), []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    tokenStorage.set(data.access, data.refresh);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  const updateUser = useCallback((u: User) => setUser(u), []);

  return (
    <AuthContext.Provider value={{ user, initializing, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
