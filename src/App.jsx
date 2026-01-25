import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './Context/AuthContext';
import './App.css';
import TargetCursor from './Components/TargetCursor/TargetCursor';

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
          <Route path="/screen" element={<Screen />} />

          {/* --- Routes that require session info --- */}
          <Route path="/" element={<Home />} />
          <Route path="/controller" element={<Controller />} />
          <Route path="/import" element={<DataImport />} />

          {/* Catch-all redirects to the home page */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
