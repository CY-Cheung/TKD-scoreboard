import React, { useEffect, useState } from 'react';
import { database } from '../../firebase';
import { ref, runTransaction } from "firebase/database";
import "./Edit.css";
import Button from "../../Components/Button/Button";
import Mask from "../../Components/Mask/Mask";
import Card from "../../Components/Card/Card";
import "../../Components/Card/Card.css";

const Edit = ({ visible, setVisible, eventName, matchId }) => {
	if (!visible) return null;

	const cardWidth = 25;
	const buttonFontSize = cardWidth / 20;

	// Re-integrated from our previous logic
    const updateStat = (side, type, index, delta) => {
        if (!eventName || !matchId) {
            console.error("Error: Missing eventName or matchId. Cannot write to database.");
            return;
        }

        let path = `events/${eventName}/matches/${matchId}/stats/${side}/${type}`;
        
        if (index !== null) {
            path += `/${index}`;
        }

        const targetRef = ref(database, path);
        runTransaction(targetRef, (currentVal) => {
            const val = currentVal || 0;
            const newVal = val + delta;
            return newVal < 0 ? 0 : newVal;
        })
        .then(() => console.log(`Updated: ${path} => ${delta}`))
        .catch((err) => console.error("Update failed", err));
    };

	// Placeholder for time update logic
	const handleTimeUpdate = () => {
		console.log("Time update logic not yet implemented.");
	}

	return (
		<>
			<Mask />
			<div
				className="edit"
				onClick={() => document.documentElement.requestFullscreen()}
			>
				<div className="cards">
					<Card color1="var(--blue-primary)" width={cardWidth}>
						<h1>Blue 藍方</h1>
						<div className="rows">
                            <div className="row">
								<p>Gam-jeom 扣分</p>
								<div className="buttons">
                                    <Button text="+" angle={210} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('blue', 'gamjeom', null, 1)} />
                                    <Button text="−" angle={210} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('blue', 'gamjeom', null, -1)} />
								</div>
							</div>
							<div className="row">
								<p>Punch 拳擊 - 1</p>
								<div className="buttons">
									<Button text="+" angle={210} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('blue', 'pointsStat', 0, 1)} />
									<Button text="−" angle={210} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('blue', 'pointsStat', 0, -1)} />
								</div>
							</div>
							<div className="row">
								<p>Body 軀幹 - 2</p>
								<div className="buttons">
                                    <Button text="+" angle={210} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('blue', 'pointsStat', 1, 1)} />
                                    <Button text="−" angle={210} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('blue', 'pointsStat', 1, -1)} />
								</div>
							</div>
							<div className="row">
								<p>Head 頭部 - 3</p>
								<div className="buttons">
                                    <Button text="+" angle={210} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('blue', 'pointsStat', 2, 1)} />
                                    <Button text="−" angle={210} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('blue', 'pointsStat', 2, -1)} />
								</div>
							</div>
							<div className="row">
								<p>Body(Turn) 軀幹(轉身) - 4</p>
								<div className="buttons">
                                    <Button text="+" angle={210} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('blue', 'pointsStat', 3, 1)} />
                                    <Button text="−" angle={210} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('blue', 'pointsStat', 3, -1)} />
								</div>
							</div>
							<div className="row">
								<p>Head(Turn) 頭部(轉身) - 5</p>
								<div className="buttons">
                                    <Button text="+" angle={210} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('blue', 'pointsStat', 4, 1)} />
                                    <Button text="−" angle={210} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('blue', 'pointsStat', 4, -1)} />
								</div>
							</div>
						</div>
					</Card>
					<Card color1="var(--yellow-primary)" width={cardWidth}>
						<h1>Edit 編輯</h1>
						<div className="rows">
							<label htmlFor="match-min">
								<h2>Match Time 剩餘比賽時間</h2>
							</label>
							<div className="row" style={{ fontSize: `${buttonFontSize}vw` }}>
								<select id="match-min" style={{ fontSize: `${buttonFontSize}vw` }}>
									{[0, 1, 2].map((min) => (
										<option key={min} value={min}>
											{min}
										</option>
									))}
								</select>{" "}
								min 分
								<select id="match-sec" style={{ fontSize: `${buttonFontSize}vw` }}>
									{Array.from({ length: 60 }, (_, sec) => (
										<option key={sec} value={sec}>
											{sec}
										</option>
									))}
								</select>{" "}
								sec 秒
							</div>
							<label htmlFor="rest-min">
								<h2>Rest Time 剩餘休息時間</h2>
							</label>
							<div className="row" style={{ fontSize: `${buttonFontSize}vw` }}>
								<select id="rest-min" style={{ fontSize: `${buttonFontSize}vw` }}>
									{[0, 1, 2].map((min) => (
										<option key={min} value={min}>
											{min}
										</option>
									))}
								</select>{" "}
								min 分
								<select id="rest-sec" style={{ fontSize: `${buttonFontSize}vw` }}>
									{Array.from({ length: 60 }, (_, sec) => (
										<option key={sec} value={sec}>
											{sec}
										</option>
									))}
								</select>{" "}
								sec 秒
							</div>
						</div>
					</Card>
					<Card color1="var(--red-primary)" width={cardWidth}>
						<h1>Red 紅方</h1>
						<div className="rows">
							<div className="row">
								<p>Gam-jeom 扣分</p>
								<div className="buttons">
                                    <Button text="+" angle={350} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('red', 'gamjeom', null, 1)} />
                                    <Button text="−" angle={350} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('red', 'gamjeom', null, -1)} />
								</div>
							</div>
							<div className="row">
								<p>Punch 拳擊 - 1</p>
								<div className="buttons">
									<Button text="+" angle={350} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('red', 'pointsStat', 0, 1)} />
									<Button text="−" angle={350} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('red', 'pointsStat', 0, -1)} />
								</div>
							</div>
							<div className="row">
								<p>Body 軀幹 - 2</p>
								<div className="buttons">
									<Button text="+" angle={350} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('red', 'pointsStat', 1, 1)} />
									<Button text="−" angle={350} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('red', 'pointsStat', 1, -1)} />
								</div>
							</div>
							<div className="row">
								<p>Head 頭部 - 3</p>
								<div className="buttons">
									<Button text="+" angle={350} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('red', 'pointsStat', 2, 1)} />
									<Button text="−" angle={350} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('red', 'pointsStat', 2, -1)} />
								</div>
							</div>
							<div className="row">
								<p>Body(Turn) 軀幹(轉身) - 4</p>
								<div className="buttons">
									<Button text="+" angle={350} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('red', 'pointsStat', 3, 1)} />
									<Button text="−" angle={350} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('red', 'pointsStat', 3, -1)} />
								</div>
							</div>
							<div className="row">
								<p>Head(Turn) 頭部(轉身) - 5</p>
								<div className="buttons">
									<Button text="+" angle={350} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('red', 'pointsStat', 4, 1)} />
									<Button text="−" angle={350} fontSize={`${buttonFontSize}vw`} onClick={() => updateStat('red', 'pointsStat', 4, -1)} />
								</div>
							</div>
						</div>
					</Card>
				</div>
				<div className="done-button">
					<Button
						text="Done"
						angle={270}
						fontSize="2.5vw"
						onClick={() => setVisible(false)}
					/>
				</div>
			</div>
		</>
	);
}

export default Edit;
