// src/Context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // 這裡存放登入後的資訊 (例如 eventId, courtId, password)
  const [authData, setAuthData] = useState(() => {
    // 嘗試從 sessionStorage 讀取，這樣重新整理網頁後不會被登出 (如果想要更嚴格，可以拿掉這段)
    const saved = sessionStorage.getItem('tkd_auth');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (data) => {
    setAuthData(data);
    // 存入 Session Storage (關閉分頁就會自動清除，比 LocalStorage 安全)
    sessionStorage.setItem('tkd_auth', JSON.stringify(data));
  };

  const logout = () => {
    setAuthData(null);
    sessionStorage.removeItem('tkd_auth');
  };

  return (
    <AuthContext.Provider value={{ authData, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
