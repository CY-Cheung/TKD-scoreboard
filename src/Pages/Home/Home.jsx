import Button from "../../Components/Button/Button";
import "./Home.css";
import { useNavigate } from "react-router-dom";

function Home() {
	const navigate = useNavigate();

	return (
		<div className="home">
			<div className="menu">
				<Button
					text="Screen"
					fontSize="2vw"
					angle={40}
					onClick={() => navigate("/screen")}
				/>
				<Button text="Controller" fontSize="2vw" angle={270} onClick={() => navigate("/controller")} />
			</div>
		</div>
	);
}

export default Home;
