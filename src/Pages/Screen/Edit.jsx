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
				<Card color1="var(--blue-primary)" height={cardHeight}>
					<h1>Blue 藍方</h1>
					<div className="row">
						<h3>Gam-jeom 扣分</h3>
						<div className="buttons">
							<Button text="+" angle={210} fontSize="3cqh" />
							<Button text="−" angle={210} fontSize="3cqh" />
						</div>
					</div>
					<div className="row">
						<h3>Punch 拳擊</h3>
						<div className="buttons">
							<Button text="+" angle={210} fontSize="3cqh" />
							<Button text="−" angle={210} fontSize="3cqh" />
						</div>
					</div>
					<div className="row">
						<h3>Body 軀幹</h3>
						<div className="buttons">
							<Button text="+" angle={210} fontSize="3cqh" />
							<Button text="−" angle={210} fontSize="3cqh" />
						</div>
					</div>
					<div className="row">
						<h3>Head 頭部</h3>
						<div className="buttons">
							<Button text="+" angle={210} fontSize="3cqh" />
							<Button text="−" angle={210} fontSize="3cqh" />
						</div>
					</div>
					<div className="row">
						<h3>Body(Turn) 軀幹(轉身)</h3>
						<div className="buttons">
							<Button text="+" angle={210} fontSize="3cqh" />
							<Button text="−" angle={210} fontSize="3cqh" />
						</div>
					</div>
					<div className="row">
						<h3>Head(Turn) 頭部(轉身)</h3>
						<div className="buttons">
							<Button text="+" angle={210} fontSize="3cqh" />
							<Button text="−" angle={210} fontSize="3cqh" />
						</div>
					</div>
				</Card>
				<Card color1="var(--yellow-primary)" height={cardHeight}>
					<h1>Time 時間</h1>
				</Card>
				<Card color1="var(--red-primary)" height={cardHeight}>
					<h1>Red 紅方</h1>
					<div className="row">
						<h3>Gam-jeom 扣分</h3>
						<div className="buttons">
							<Button text="+" angle={350} fontSize="3cqh" />
							<Button text="−" angle={350} fontSize="3cqh" />
						</div>
					</div>
					<div className="row">
						<h3>Punch 拳擊</h3>
						<div className="buttons">
							<Button text="+" angle={350} fontSize="3cqh" />
							<Button text="−" angle={350} fontSize="3cqh" />
						</div>
					</div>
					<div className="row">
						<h3>Body 軀幹</h3>
						<div className="buttons">
							<Button text="+" angle={350} fontSize="3cqh" />
							<Button text="−" angle={350} fontSize="3cqh" />
						</div>
					</div>
					<div className="row">
						<h3>Head 頭部</h3>
						<div className="buttons">
							<Button text="+" angle={350} fontSize="3cqh" />
							<Button text="−" angle={350} fontSize="3cqh" />
						</div>
					</div>
					<div className="row">
						<h3>Body(Turn) 軀幹(轉身)</h3>
						<div className="buttons">
							<Button text="+" angle={350} fontSize="3cqh" />
							<Button text="−" angle={350} fontSize="3cqh" />
						</div>
					</div>
					<div className="row">
						<h3>Head(Turn) 頭部(轉身)</h3>
						<div className="buttons">
							<Button text="+" angle={350} fontSize="3cqh" />
							<Button text="−" angle={350} fontSize="3cqh" />
						</div>
					</div>
				</Card>
			</div>
		</>
	);
}

export default Edit;
