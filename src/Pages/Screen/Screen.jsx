import React, { useState, useEffect } from "react";
import "./Screen.css";
import "./Edit.css";
import Edit from "./Edit";

function ScoreBoard() {
	const [timeoutActive, setTimeoutActive] = useState(true);
	const [direction, setDirection] = useState("row");
	const [showEdit, setShowEdit] = useState(false);

	const handleTimeoutClick = () => {
		setTimeoutActive((prev) => !prev);
	};

	// 空白鍵觸發 timeout，反斜線鍵切換方向，E鍵切換edit顯示
	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.code === "Space") {
				handleTimeoutClick();
			}
			if (e.key === "\\") {
				setDirection((prev) =>
					prev === "row" ? "row-reverse" : "row"
				);
			}
			if (e.key === "e" || e.key === "E") {
				setShowEdit((prev) => !prev);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<>
			<div
				className="screen"
				onClick={() => document.documentElement.requestFullscreen()}
			>
				<div className="top" style={{ flexDirection: direction }}>
					<div className="red-name red-bg name-font">
						Red Player
					</div>
					<div className="blue-name blue-bg name-font">
						Blue Player
					</div>
				</div>
				<div
					className="midbottom"
					style={{ flexDirection: direction, display: "flex" }}
				> {/*19:39:34:39:19 = 150*/}
					<div className="red-log red-bg">
						<div className="red-ref-log red-bg">
							<div>X</div>
							<div>O</div>
							<div>O</div>
							<div>O</div>
						</div>
						<div className="red-gamjeom red-bg">
							<div className="gamjeom-font">GAM-JEOM</div>
							<div className="gamjeom-number">0</div>
						</div>
					</div>
					<div className="red-score red-bg">
						<div className="red-score-text red-score-bg score-font">
							0
						</div>
						<div className="red-score-info red-bg"></div>
					</div>
					<div className="match-info">
						<div
							className="match"
							onClick={() =>
								setDirection((prev) =>
									prev === "row" ? "row-reverse" : "row"
								)
							}
						>
							<div className="match-font">MATCH</div>
							<div className="match-number">A1001</div>
						</div>
						<div className="timer">
							<div
								className={`game-timer timer-font ${
									timeoutActive ? " timeout-active" : ""
								}`}
								onClick={handleTimeoutClick}
								style={{
									color: timeoutActive
										? "#FFFFFF"
										: "#FFFF00",
									cursor: "pointer",
								}}
							>
								2:00
							</div>
							<div
								className={`time-out match-font ${
									timeoutActive ? " timeout-active" : ""
								}`}
								onClick={handleTimeoutClick}
								style={{
									backgroundColor: timeoutActive
										? "#000000"
										: "#FFFF00",
									cursor: "pointer",
								}}
							>
								Time out
							</div>
						</div>
						<div
							className="round-info"
							onClick={() => setShowEdit((prev) => !prev)}
						>
							<div className="round-font">ROUND</div>
							<div className="round-number">1</div>
						</div>
					</div>
					<div className="blue-score blue-bg">
						<div className="blue-score-text blue-score-bg score-font">
							0
						</div>
						<div className="blue-score-info blue-bg"></div>
					</div>
					<div className="blue-log blue-bg">
						<div className="blue-ref-log blue-bg">
							<div>X</div>
							<div>O</div>
							<div>O</div>
							<div>O</div>
						</div>
						<div className="blue-gamjeom blue-bg">
							<div className="gamjeom-font">GAM-JEOM</div>
							<div className="gamjeom-number">0</div>
						</div>
					</div>
				</div>
			</div>
			<Edit visible={showEdit} setVisible={setShowEdit} />
		</>
	);
}

export default ScoreBoard;
