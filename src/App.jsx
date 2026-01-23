import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './Context/AuthContext';
import ProtectedRoute from './Components/ProtectedRoute/ProtectedRoute';
import './App.css';
import TargetCursor from './Components/TargetCursor/TargetCursor';

// Pages
import Home from './Pages/Home/Home';
import CourtSetup from './Pages/CourtSetup/CourtSetup';
import Controller from './Pages/Controller/Controller';
import Screen from './Pages/Screen/Screen';
import DataImport from './Pages/DataImport/DataImport';
import RefereeRegister from './Pages/RefereeRegister/RefereeRegister';
import Login from './Pages/Login/Login'; // Import the Login page

function App() {
  return (
    <BrowserRouter basename="/TKD-scoreboard">
      <AuthProvider>
        <TargetCursor targetSelector="input, select, .cursor-target" />
        <Routes>
          {/* --- Public Routes --- */}
          <Route path="/login" element={<Login />} />
          <Route path="/court-setup" element={<CourtSetup />} />
          <Route path="/screen" element={<Screen />} />

          {/* --- Protected Routes --- */}
          <Route path="/" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />

          <Route path="/controller" element={
            <ProtectedRoute>
              <Controller />
            </ProtectedRoute>
          } />
          <Route path="/import" element={
            <ProtectedRoute>
              <DataImport />
            </ProtectedRoute>
          } />
          <Route path="/referee/register" element={
            <ProtectedRoute>
              <RefereeRegister />
            </ProtectedRoute>
          } />

          {/* Catch-all redirects to the protected home page or login */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
