import "./App.css";
import Home from "./Pages/Home/Home";
import Controller from "./Pages/Controller/Controller";
import Screen from "./Pages/Screen/Screen";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/controller.html" element={<Controller />} />
				<Route path="/screen.html" element={<Screen />} />
			</Routes>
		</Router>
	);
}

export default App;
