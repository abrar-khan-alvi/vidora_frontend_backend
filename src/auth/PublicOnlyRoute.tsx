import { Navigate, Outlet } from 'react-router-dom';
import { FullScreenLoader } from '../components/FullScreenLoader';
import { useAuth } from './AuthContext';

/** For auth screens: a logged-in user gets redirected to the dashboard. */
export function PublicOnlyRoute() {
  const { user, initializing } = useAuth();

  if (initializing) return <FullScreenLoader />;
  if (user) return <Navigate to="/dashboard/overview" replace />;

  return <Outlet />;
}
