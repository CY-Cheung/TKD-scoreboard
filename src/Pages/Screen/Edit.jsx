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
					{/* 這裡可以加內容 */}
				</Card>
				<Card color="var(--yellow-primary)" height={cardHeight}>
					{/* 這裡可以加內容 */}
				</Card>
				<Card color="var(--red-primary)" height={cardHeight}>
					{/* 這裡可以加內容 */}
				</Card>
			</div>
		</>
	);
}

export default Edit;
