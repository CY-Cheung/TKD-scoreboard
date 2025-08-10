import "./Edit.css";
import Button from "../../Components/Button/Button";
import { useState } from "react";

const fontSize = "1.5vw"; // 統一設定按鈕字體大小

const scoreTypes = [
	{ label: "Gam-jeom" },
	{ label: "Punch (1)" },
	{ label: "Body (2)" },
	{ label: "Head (3)" },
	{ label: "Turn Body (4)" },
	{ label: "Turn Head (5)" },
];

function Edit({ visible, setVisible }) {
	// 預設 1 分 0 秒
	const [roundMin, setRoundMin] = useState(1);
	const [roundSec, setRoundSec] = useState(0);
	const [restMin, setRestMin] = useState(0);
	const [restSec, setRestSec] = useState(30);

	const minuteOptions = Array.from({ length: 3 }, (_, i) => i); // 0~2 分
	const secondOptions = Array.from({ length: 60 }, (_, i) => i); // 0~59 秒

	if (!visible) return null;
	return (
		<div className="edit" style={{ fontSize }}>
			<h2>Edit Score</h2>
			<div className="edit-score" style={{ fontSize }}>
				{/* 第一列：標題 */}
				<div className="cell header" style={{ fontSize }}></div>
				{scoreTypes.map((type, idx) => (
					<div
						className="cell header"
						key={`header-${idx}`}
						style={{ fontSize }}
					>
						{type.label}
					</div>
				))}
				{/* 第二列：Blue 按鈕 */}
				<div className="cell side" style={{ fontSize }}>
					Blue
				</div>
				{scoreTypes.map((_, idx) => (
					<div className="cell" key={`blue-${idx}`}>
						<Button text={"+1"} angle={210} fontSize={fontSize} />
						<Button text={"−1"} angle={210} fontSize={fontSize} />
					</div>
				))}
				{/* 第三列：Red 按鈕 */}
				<div className="cell side" style={{ fontSize }}>
					Red
				</div>
				{scoreTypes.map((_, idx) => (
					<div className="cell" key={`red-${idx}`}>
						<Button text={"+1"} angle={350} fontSize={fontSize} />
						<Button text={"−1"} angle={350} fontSize={fontSize} />
					</div>
				))}
			</div>
			<h2>Edit Time</h2>
			<div className="edit-time" style={{ fontSize }}>
				<div className="edit-time-label" style={{ fontSize }}>
					Round Time Remaining:
				</div>
				<div className="edit-time-inputs">
					<select
						value={roundMin}
						onChange={(e) => setRoundMin(Number(e.target.value))}
						style={{ "--font-size": fontSize }}
					>
						{minuteOptions.map((m) => (
							<option key={m} value={m} style={{ fontSize }}>
								{m}
							</option>
						))}
					</select>
					<span style={{ fontSize }}>min</span>
					<select
						value={roundSec}
						onChange={(e) => setRoundSec(Number(e.target.value))}
						style={{ "--font-size": fontSize, marginLeft: "0.5em" }}
					>
						{secondOptions.map((s) => (
							<option key={s} value={s} style={{ fontSize }}>
								{s}
							</option>
						))}
					</select>
					<span style={{ fontSize }}>sec</span>
				</div>
				<div className="edit-time-label" style={{ fontSize }}>
					Rest Time Remaining:
				</div>
				<div className="edit-time-inputs">
					<select
						value={restMin}
						onChange={(e) => setRestMin(Number(e.target.value))}
						style={{ "--font-size": fontSize }}
					>
						{minuteOptions.map((m) => (
							<option key={m} value={m} style={{ fontSize }}>
								{m}
							</option>
						))}
					</select>
					<span style={{ fontSize }}>min</span>
					<select
						value={restSec}
						onChange={(e) => setRestSec(Number(e.target.value))}
						style={{ "--font-size": fontSize, marginLeft: "0.5em" }}
					>
						{secondOptions.map((s) => (
							<option key={s} value={s} style={{ fontSize }}>
								{s}
							</option>
						))}
					</select>
					<span style={{ fontSize }}>sec</span>
				</div>
			</div>
			<h2>
				<Button
					text="Done"
					fontSize={fontSize}
					angle={120}
					onClick={() => setVisible(false)}
				/>
				<Button
					text="Cancel"
					fontSize={fontSize}
					angle={30}
					onClick={() => setVisible(false)}
				/>
			</h2>
		</div>
	);
}

export default Edit;
