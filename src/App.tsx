import { Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  LoginScreen,
  CreateAccountScreen,
  ForgotPasswordScreen,
  VerifyEmailScreen,
  SetPasswordScreen,
  PasswordUpdatedScreen,
  AccountCreatedScreen
} from './Screens';
import { DashboardScreen } from './Dashboard';
import { LandingPage } from './pages/LandingPage';
import { SharePage } from './pages/SharePage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { PublicOnlyRoute } from './auth/PublicOnlyRoute';

// Maps the legacy screen names (still used throughout the UI) to real URLs.
const screenToPath: Record<string, string> = {
  LANDING: '/',
  DASHBOARD: '/dashboard/prompton',
  LOGIN: '/login',
  CREATE_ACCOUNT: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  VERIFY_EMAIL: '/verify-email',
  VERIFY_EMAIL_SIGNUP: '/verify-email-signup',
  SET_PASSWORD: '/set-password',
  PASSWORD_UPDATED: '/password-updated',
  ACCOUNT_CREATED: '/account-created',
};

// Hook that returns a `setScreen(name)` compatible function backed by the router,
// so existing call sites keep working while the URL stays in sync.
const useSetScreen = () => {
  const navigate = useNavigate();
  return (screen: string) => navigate(screenToPath[screen] ?? '/');
};

// Centered card + animated transitions shared by every auth screen.
const AuthLayout = () => {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-[#08080A] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">

      {/* Background Decorative Glows */}
      <div className="absolute top-[0%] left-[0%] w-[45vw] h-[45vw] min-w-[400px] bg-[#673BA5] opacity-20 rounded-full blur-[140px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] min-w-[400px] bg-[#3B82F6] opacity-10 rounded-full blur-[140px] pointer-events-none mix-blend-screen" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[450px] bg-[#161619] border border-white/[0.04] shadow-2xl rounded-[18px] p-8 sm:p-10 pt-10 sm:pt-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
};

export default function App() {
  const setScreen = useSetScreen();

  return (
    <Routes>
      <Route path="/" element={<LandingPage setScreen={setScreen} />} />

      {/* Public share page — no auth required */}
      <Route path="/share/:token" element={<SharePage />} />

      {/* Authenticated area */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard/*" element={<DashboardScreen />} />
      </Route>

      {/* Auth screens — redirect to the dashboard if already signed in */}
      <Route element={<PublicOnlyRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginScreen setScreen={setScreen} />} />
          <Route path="/signup" element={<CreateAccountScreen setScreen={setScreen} />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen setScreen={setScreen} />} />
          <Route path="/verify-email" element={<VerifyEmailScreen setScreen={setScreen} mode="reset" />} />
          <Route path="/verify-email-signup" element={<VerifyEmailScreen setScreen={setScreen} mode="signup" />} />
          <Route path="/set-password" element={<SetPasswordScreen setScreen={setScreen} />} />
          <Route path="/password-updated" element={<PasswordUpdatedScreen setScreen={setScreen} />} />
          <Route path="/account-created" element={<AccountCreatedScreen setScreen={setScreen} />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
