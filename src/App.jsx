import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from './Context/AuthContext';
import ProtectedRoute from './Components/ProtectedRoute/ProtectedRoute';

// Components
import TargetCursor from "./Components/TargetCursor/TargetCursor";

// Pages
import Home from "./Pages/Home/Home";
import CourtSetup from "./Pages/CourtSetup/CourtSetup";
import Screen from "./Pages/Screen/Screen";
import RefereeLogin from "./Pages/RefereeLogin/RefereeLogin";
import RefereeRegister from "./Pages/RefereeRegister/RefereeRegister";
import Controller from "./Pages/Controller/Controller";
import DataImport from "./Pages/DataImport/DataImport";

function App() {
	return (
        <AuthProvider>
            <TargetCursor spinDuration={3.14} hideDefaultCursor={true} />
            <Router basename="/TKD-scoreboard">
                <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/setup" element={<CourtSetup />} />
                    <Route path="/screen" element={<Screen />} />
                    <Route path="/referee/login" element={<RefereeLogin />} />

                    {/* Protected routes */}
                    <Route path="/controller" element={<ProtectedRoute><Controller /></ProtectedRoute>} />
                    <Route path="/import" element={<ProtectedRoute><DataImport /></ProtectedRoute>} />
                    <Route path="/referee/register" element={<ProtectedRoute><RefereeRegister /></ProtectedRoute>} />
                </Routes>
            </Router>
        </AuthProvider>
	);
}

export default App;
