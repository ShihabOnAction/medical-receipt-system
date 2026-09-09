import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { PageLoader } from './ui/Card.jsx';

/**
 * Route guard.
 *
 * This only shapes navigation - the API re-checks the session, the role and
 * the account status on every single request, so a tampered client gains
 * nothing.
 */
export function ProtectedRoute({ children, requireAdmin = false }) {
  const { loading, isAuthenticated, isApproved, isAdmin, status } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Checking your session…" />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Signed in, but the administrator has not activated the account yet.
  if (!isApproved) {
    return <Navigate to="/pending" replace state={{ status }} />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/staff/dashboard" replace />;
  }

  return children;
}

/** Sends an already signed-in user away from the login/register pages. */
export function PublicOnlyRoute({ children }) {
  const { loading, isAuthenticated, isApproved, isAdmin } = useAuth();

  if (loading) return <PageLoader />;

  if (isAuthenticated) {
    if (!isApproved) return <Navigate to="/pending" replace />;
    return <Navigate to={isAdmin ? '/admin/dashboard' : '/staff/dashboard'} replace />;
  }

  return children;
}

export default ProtectedRoute;
