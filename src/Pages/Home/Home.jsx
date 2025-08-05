import Button from "../../Components/Button/Button";
import "./Home.css";

function Home() {
	return (
		<div className="home">
			<div className="menu">
				<Button text="Scoreboard" fontSize="2rem" angle={40} />
				<Button text="Remote" fontSize="2rem" angle={270} />
			</div>
		</div>
	);
}

export default Home;
