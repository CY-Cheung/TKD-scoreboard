import "./App.css";
import Home from "./Pages/Home/Home";
import Remote from "./Pages/Remote/Remote";
import ScoreBoard from "./Pages/ScoreBoard/ScoreBoard";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/remote" element={<Remote />} />
				<Route path="/scoreboard" element={<ScoreBoard />} />
			</Routes>
		</Router>
	);
}

export default App;
