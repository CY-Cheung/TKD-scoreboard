import Button from "../../Components/Button/Button";
import "./Home.css";
import { useNavigate } from "react-router-dom";

function Home() {
	const navigate = useNavigate();

	return (
		<div className="home">
			<div className="menu">
				<Button
					text="Scoreboard"
					fontSize="2rem"
					angle={40}
					onClick={() => navigate("/scoreboard")}
				/>
				<Button text="Remote" fontSize="2rem" angle={270} />
			</div>
		</div>
	);
}

export default Home;
