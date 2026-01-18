// src/Components/ProtectedRoute/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { authData } = useAuth();
  const location = useLocation();

  if (!authData) {
    // 如果沒有登入資料，將用戶踢回 Court Setup (首頁)
    // replace: true 代表按上一頁不會回到這個禁止頁面
    return <Navigate to="/setup" state={{ from: location }} replace />;
  }

  // 如果有登入，顯示目標頁面
  return children;
};

export default ProtectedRoute;
