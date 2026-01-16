import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Components
import TargetCursor from "./Components/TargetCursor/TargetCursor";

// Pages
import Home from "./Pages/Home/Home";
import Admin from "./Pages/Admin/AdminDashboard";
import CourtSetup from "./Pages/CourtSetup/CourtSetup";
import Screen from "./Pages/Screen/Screen";
import RefereeLogin from "./Pages/Referee/RefereeLogin";
import Controller from "./Pages/Controller/Controller";

function App() {
	return (
		<>
			<TargetCursor spinDuration={3.14} hideDefaultCursor={true} />
			<Router basename="/TKD-scoreboard">
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/admin" element={<Admin />} />
					<Route path="/setup" element={<CourtSetup />} />
					<Route path="/screen" element={<Screen />} />
					<Route path="/referee/login" element={<RefereeLogin />} />
					<Route path="/controller" element={<Controller />} />
				</Routes>
			</Router>
		</>
	);
}

export default App;
