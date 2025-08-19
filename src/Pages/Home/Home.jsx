import Button from "../../Components/Button/Button";
import "./Home.css";
import { useNavigate } from "react-router-dom";
import DarkVeil from "../../Components/DarkVeil/DarkVeil";

function Home() {
	const navigate = useNavigate();

	return (
		<>
			<div className="home">
				<DarkVeil />
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
		</>
	);
}

export default Home;
