import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  hasStoredEventSession,
  useEventSession,
} from '../../Context/EventSessionContext';

/**
 * Guards routes that require an active Event ID and Court ID session.
 * Checks:
 * 1. EventSessionContext state
 * 2. sessionStorage fallback
 * 3. URL query parameters (QR deep-link: /controller?event=X&court=Y)
 */
function ProtectedRoute({ children }) {
  const { session } = useEventSession();
  const location = useLocation();

  const hasUrlParams = () => {
    const searchParams = new URLSearchParams(location.search);
    const hasSearch = searchParams.get('event') && searchParams.get('court');
    if (hasSearch) return true;

    if (window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.split('?')[1];
      const hashParams = new URLSearchParams(hashQuery);
      return hashParams.get('event') && hashParams.get('court');
    }
    return false;
  };

  const hasEventSession = !!session || hasStoredEventSession() || hasUrlParams();

  if (!hasEventSession) {
    // Send guests to Landing (Google CTA). Signed-in users are auto-forwarded
    // from Landing → /court-setup. Do not show Court Setup's old login wall.
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default ProtectedRoute;
