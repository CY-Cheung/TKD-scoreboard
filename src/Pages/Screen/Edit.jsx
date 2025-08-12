import "./Edit.css";
import Button from "../../Components/Button/Button";
import { useState } from "react";
import Mask from "../../Components/Mask/Mask";
import Card from "../../Components/Card/Card";
import "../../Components/Card/Card.css";

function Edit({ visible, setVisible }) {
	if (!visible) return null;
	const cardHeight = 62.5;
	const cardWidth = 25;
	return (
		<>
			<Mask />
			<div className="edit">
				<div className="cards">
					<Card
						color1="var(--blue-primary)"
						height={cardHeight}
						width={cardWidth}
					>
						<h1>Blue 藍方</h1>
						<div className="rows">
							<div className="row">
								<p>Gam-jeom 扣分</p>
								<div className="buttons">
									<Button
										text="+"
										angle={210}
										fontSize="3cqh"
									/>
									<Button
										text="−"
										angle={210}
										fontSize="3cqh"
									/>
								</div>
							</div>
							<div className="row">
								<p>Punch 拳擊 - 1</p>
								<div className="buttons">
									<Button
										text="+"
										angle={210}
										fontSize="3cqh"
									/>
									<Button
										text="−"
										angle={210}
										fontSize="3cqh"
									/>
								</div>
							</div>
							<div className="row">
								<p>Body 軀幹 - 2</p>
								<div className="buttons">
									<Button
										text="+"
										angle={210}
										fontSize="3cqh"
									/>
									<Button
										text="−"
										angle={210}
										fontSize="3cqh"
									/>
								</div>
							</div>
							<div className="row">
								<p>Head 頭部 - 3</p>
								<div className="buttons">
									<Button
										text="+"
										angle={210}
										fontSize="3cqh"
									/>
									<Button
										text="−"
										angle={210}
										fontSize="3cqh"
									/>
								</div>
							</div>
							<div className="row">
								<p>Body(Turn) 軀幹(轉身) - 4</p>
								<div className="buttons">
									<Button
										text="+"
										angle={210}
										fontSize="3cqh"
									/>
									<Button
										text="−"
										angle={210}
										fontSize="3cqh"
									/>
								</div>
							</div>
							<div className="row">
								<p>Head(Turn) 頭部(轉身) - 5</p>
								<div className="buttons">
									<Button
										text="+"
										angle={210}
										fontSize="3cqh"
									/>
									<Button
										text="−"
										angle={210}
										fontSize="3cqh"
									/>
								</div>
							</div>
						</div>
					</Card>
					<Card
						color1="var(--yellow-primary)"
						height={cardHeight}
						width={cardWidth}
					>
						<h1>Time 時間</h1>
					</Card>
					<Card
						color1="var(--red-primary)"
						height={cardHeight}
						width={cardWidth}
					>
						<h1>Red 紅方</h1>
						<div className="rows">
							<div className="row">
								<p>Gam-jeom 扣分</p>
								<div className="buttons">
									<Button
										text="+"
										angle={350}
										fontSize="3cqh"
									/>
									<Button
										text="−"
										angle={350}
										fontSize="3cqh"
									/>
								</div>
							</div>
							<div className="row">
								<p>Punch 拳擊 - 1</p>
								<div className="buttons">
									<Button
										text="+"
										angle={350}
										fontSize="3cqh"
									/>
									<Button
										text="−"
										angle={350}
										fontSize="3cqh"
									/>
								</div>
							</div>
							<div className="row">
								<p>Body 軀幹 - 2</p>
								<div className="buttons">
									<Button
										text="+"
										angle={350}
										fontSize="3cqh"
									/>
									<Button
										text="−"
										angle={350}
										fontSize="3cqh"
									/>
								</div>
							</div>
							<div className="row">
								<p>Head 頭部 - 3</p>
								<div className="buttons">
									<Button
										text="+"
										angle={350}
										fontSize="3cqh"
									/>
									<Button
										text="−"
										angle={350}
										fontSize="3cqh"
									/>
								</div>
							</div>
							<div className="row">
								<p>Body(Turn) 軀幹(轉身) - 4</p>
								<div className="buttons">
									<Button
										text="+"
										angle={350}
										fontSize="3cqh"
									/>
									<Button
										text="−"
										angle={350}
										fontSize="3cqh"
									/>
								</div>
							</div>
							<div className="row">
								<p>Head(Turn) 頭部(轉身) - 5</p>
								<div className="buttons">
									<Button
										text="+"
										angle={350}
										fontSize="3cqh"
									/>
									<Button
										text="−"
										angle={350}
										fontSize="3cqh"
									/>
								</div>
							</div>
						</div>
					</Card>
				</div>
				<div className="done-button">
					<Button
						text="Done"
						angle={270}
						fontSize="4cqh"
						onClick={() => setVisible(false)}
					/>
				</div>
			</div>
		</>
	);
}

export default Edit;
