import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullScreenLoader } from '../components/FullScreenLoader';
import { useAuth } from './AuthContext';

/** Gates child routes behind a valid session; bounces guests to /login. */
export function ProtectedRoute() {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
}
