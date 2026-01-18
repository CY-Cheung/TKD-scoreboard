import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // 沒登入？踢回 court-setup，並記住他原本想去哪 (state: { from... })
    return <Navigate to="/court-setup" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
