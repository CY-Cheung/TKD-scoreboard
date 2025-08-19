import Button from "../../Components/Button/Button";
import "./Home.css";
import { useNavigate } from "react-router-dom";

function Home() {
	const navigate = useNavigate();

	return (
		<div className="home" onClick={() => document.documentElement.requestFullscreen()}>
			<div className="menu">
				<Button
					text="Screen"
					fontSize="3dvw"
					angle={40}
					onClick={() => navigate("/screen.html")}
				/>
				<Button
					text="Controller"
					fontSize="3dvw"
					angle={270}
					onClick={() => navigate("/controller.html")}
				/>
			</div>
		</div>
	);
}

export default Home;
