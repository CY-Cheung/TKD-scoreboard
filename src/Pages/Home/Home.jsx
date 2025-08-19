import Button from "../../Components/Button/Button";
import "./Home.css";
import { useNavigate } from "react-router-dom";
import Squares from "../../Components/Squares/Squares";

function Home() {
	const navigate = useNavigate();

	return (
		<div
			className="home"
			onClick={() => document.documentElement.requestFullscreen()}
		>
			<Squares
				speed={0.5}
				squareSize={100}
				direction="diagonal"
				borderColor="hsla(270, 50%, 50%, 0.25)"
				hoverFillColor="hsla(60, 50%, 50%, 0.25)"
			/>
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
