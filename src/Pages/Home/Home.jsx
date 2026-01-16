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
					onClick={() => navigate("/screen")}
				/>
				<Button
					text="Controller"
					fontSize="3dvw"
					angle={270}
					onClick={() => navigate("/controller")}
				/>
        <Button
					text="Admin"
					fontSize="3dvw"
					angle={120}
					onClick={() => navigate("/admin")}
				/>
        <Button
					text="Court Launcher"
					fontSize="3dvw"
					angle={210}
					onClick={() => navigate("/launcher")}
				/>
        <Button
					text="Referee Register"
					fontSize="3dvw"
					angle={310}
					onClick={() => navigate("/referee/register")}
				/>
			</div>
		</div>
	);
}

export default Home;