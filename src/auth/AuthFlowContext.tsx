import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Transient state shared across the multi-step auth screens (signup → verify,
 * forgot → verify → set password). Kept separate from the logged-in session.
 */
interface AuthFlowValue {
  email: string;
  resetToken: string;
  setEmail: (email: string) => void;
  setResetToken: (token: string) => void;
  reset: () => void;
}

const AuthFlowContext = createContext<AuthFlowValue | undefined>(undefined);

export function AuthFlowProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');

  const value = useMemo<AuthFlowValue>(
    () => ({
      email,
      resetToken,
      setEmail,
      setResetToken,
      reset: () => {
        setEmail('');
        setResetToken('');
      },
    }),
    [email, resetToken],
  );

  return <AuthFlowContext.Provider value={value}>{children}</AuthFlowContext.Provider>;
}

export function useAuthFlow() {
  const ctx = useContext(AuthFlowContext);
  if (!ctx) throw new Error('useAuthFlow must be used within an AuthFlowProvider');
  return ctx;
}
