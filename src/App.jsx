import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './Context/AuthContext';
import './App.css';
import TargetCursor from './Components/TargetCursor/TargetCursor';
import ProtectedRoute from './Components/ProtectedRoute/ProtectedRoute';

// Pages
import Home from './Pages/Home/Home';
import CourtSetup from './Pages/CourtSetup/CourtSetup';
import Controller from './Pages/Controller/Controller';
import Screen from './Pages/Screen/Screen';
import DataImport from './Pages/DataImport/DataImport';

function App() {
  return (
    <BrowserRouter basename="/TKD-scoreboard">
      <AuthProvider>
        <TargetCursor targetSelector="input, select, .cursor-target" />
        <Routes>
          {/* --- Public Routes --- */}
          <Route path="/court-setup" element={<CourtSetup />} />

          {/* --- Routes that require session info (Protected Routes) --- */}
          <Route 
            path="/screen" 
            element={
              <ProtectedRoute>
                <Screen />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/controller" 
            element={
              <ProtectedRoute>
                <Controller />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/import" 
            element={
              <ProtectedRoute>
                <DataImport />
              </ProtectedRoute>
            } 
          />

          {/* Catch-all redirects to the home page */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
