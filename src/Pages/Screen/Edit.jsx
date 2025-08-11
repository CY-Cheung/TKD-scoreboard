import "./Edit.css";
import Button from "../../Components/Button/Button";
import { useState } from "react";
import Mask from "../../Components/Mask/Mask";
import Card from "../../Components/Card/Card";
import "../../Components/Card/Card.css";

function Edit({ visible, setVisible }) {
	if (!visible) return null;
	const cardHeight = 75;
	return (
		<>
			<Mask />
			<div className="edit">
				<Card color="var(--blue-primary)" height={cardHeight}>
					<h1>Blue 藍</h1>
					<Button text="+" angle={240} fontSize="2vw"/>
					<Button text="−" angle={240} fontSize="2vw"/>	
				</Card>
				<Card color="var(--yellow-primary)" height={cardHeight}>
					<h1>Time 時間</h1>
				</Card>
				<Card color="var(--red-primary)" height={cardHeight}>
					<h1>Red 紅</h1>
				</Card>
			</div>
		</>
	);
}

export default Edit;
