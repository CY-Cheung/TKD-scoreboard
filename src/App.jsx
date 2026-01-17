import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Components
import TargetCursor from "./Components/TargetCursor/TargetCursor";

// Pages
import Home from "./Pages/Home/Home";
import CourtSetup from "./Pages/CourtSetup/CourtSetup";
import Screen from "./Pages/Screen/Screen";
import RefereeRegister from "./Pages/RefereeRegister/RefereeRegister";
import Controller from "./Pages/Controller/Controller";
import DataImport from "./Pages/DataImport/DataImport";

function App() {
	return (
		<>
			<TargetCursor spinDuration={3.14} hideDefaultCursor={true} />
			<Router basename="/TKD-scoreboard">
				<Routes>
                    {/* All routes are now public */}
					<Route path="/" element={<Home />} />
					<Route path="/setup" element={<CourtSetup />} />
					<Route path="/screen" element={<Screen />} />
					<Route path="/referee/register" element={<RefereeRegister />} />
					<Route path="/controller" element={<Controller />} />
					<Route path="/import" element={<DataImport />} />
				</Routes>
			</Router>
		</>
	);
}

export default App;
