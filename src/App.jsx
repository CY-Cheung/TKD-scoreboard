import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './Context/AuthContext';
import { EventSessionProvider } from './Context/EventSessionContext';
import { PopupProvider } from './Context/PopupContext';
import './App.css';
import TargetCursor from './Components/TargetCursor/TargetCursor';
import ProtectedRoute from './Components/ProtectedRoute/ProtectedRoute';
import useBrowserViewportCssVars from './Utils/useBrowserViewportCssVars';

// Pages
import Landing from './Pages/Landing/Landing';
import Home from './Pages/Home/Home';
import CourtSetup from './Pages/CourtSetup/CourtSetup';
import Controller from './Pages/Controller/Controller';
import ControllerVisualPreview from './Pages/Controller/ControllerVisualPreview';
import Screen from './Pages/Screen/Screen';
import DataImport from './Pages/DataImport/DataImport';

function App() {
  useBrowserViewportCssVars();

  return (
    <BrowserRouter basename="/TKD-scoreboard">
      <AuthProvider>
        <EventSessionProvider>
          <PopupProvider>
            <TargetCursor targetSelector="input, select, .cursor-target" />
            <Routes>
            {/* --- Public Routes --- */}
            <Route path="/" element={<Landing />} />
            <Route path="/court-setup" element={<CourtSetup />} />
            {/* Design-review shell (no Firebase); safe to remove after UI sign-off */}
            <Route path="/controller-preview" element={<ControllerVisualPreview />} />

            {/* --- Routes that require event/court session (Protected Routes) --- */}
            <Route 
              path="/screen" 
              element={
                <ProtectedRoute>
                  <Screen />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/home" 
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
          </PopupProvider>
        </EventSessionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
