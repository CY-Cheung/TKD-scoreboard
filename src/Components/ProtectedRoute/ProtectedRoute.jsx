import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';

/**
 * ProtectedRoute Component
 * Guards routes that require an active Event ID and Court ID session.
 * Automatically checks:
 * 1. AuthContext session state
 * 2. sessionStorage fallback
 * 3. URL query parameters (for direct QR Code scan access like /controller?event=X&court=Y)
 */
function ProtectedRoute({ children }) {
  const { session } = useAuth();
  const location = useLocation();

  // Helper to check if URL query params contain event and court
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

  const hasSessionStorage = () => {
    return !!(sessionStorage.getItem('selectedEvent') && sessionStorage.getItem('selectedCourt'));
  };

  const isAuthenticated = !!session || hasSessionStorage() || hasUrlParams();

  if (!isAuthenticated) {
    return <Navigate to="/welcome" replace />;
  }

  return children;
}

export default ProtectedRoute;
