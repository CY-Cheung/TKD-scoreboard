import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './Context/AuthContext';
import ProtectedRoute from './Components/ProtectedRoute/ProtectedRoute';
import './App.css'; // Import the main stylesheet
import TargetCursor from './Components/TargetCursor/TargetCursor'; // Import the TargetCursor

// Pages
import Home from './Pages/Home/Home';
import CourtSetup from './Pages/CourtSetup/CourtSetup';
import Controller from './Pages/Controller/Controller';
import Screen from './Pages/Screen/Screen';
import RefereeLogin from './Pages/RefereeLogin/RefereeLogin';
import DataImport from './Pages/DataImport/DataImport';
import RefereeRegister from './Pages/RefereeRegister/RefereeRegister';

function App() {
  return (
    <AuthProvider>
      {/* By adding the selector here, we make all inputs, selects, and elements with the .cursor-target class interactive with the cursor */}
      <TargetCursor targetSelector="input, select, .cursor-target" />
      <BrowserRouter basename="/TKD-scoreboard">
        <Routes>
          {/* --- Public Routes --- */}
          <Route path="/court-setup" element={<CourtSetup />} />
          <Route path="/screen" element={<Screen />} />
          <Route path="/referee/login" element={<RefereeLogin />} />

          {/* --- Protected Routes --- */}
          {/* The root route is now the Home menu */}
          <Route path="/" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />

          {/* Other protected pages */}
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

          {/* Catch-all redirects to the protected home page */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
