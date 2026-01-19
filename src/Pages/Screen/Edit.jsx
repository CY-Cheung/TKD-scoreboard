import React, { useEffect, useState } from 'react';
import { database } from '../../firebase';
import { ref, get, update } from "firebase/database";
import "./Edit.css";
import Button from "../../Components/Button/Button";
import { updateScoreAndCheckRules, startRestTime, startNextRound, promoteWinner } from '../../Api';

const Edit = ({ visible, setVisible, eventName, matchId, matchData }) => {
    const [matchMin, setMatchMin] = useState(0);
    const [matchSec, setMatchSec] = useState(0);
    const [restMin, setRestMin] = useState(0);
    const [restSec, setRestSec] = useState(0);
    const [showSuperiorityVote, setShowSuperiorityVote] = useState(false);

    const handleWinDeclaration = (winnerSide) => {
        if (!eventName || !matchId || !winnerSide) return;
        startRestTime(eventName, matchId, winnerSide);
        setVisible(false);
        setShowSuperiorityVote(false);
    };

    const handleStartNextRound = () => {
        if (!eventName || !matchId) return;
        startNextRound(eventName, matchId);
        setVisible(false);
    };

    const handleDeclareWinner = () => {
        const dominantSide = matchData?.dominantSide;
        if (dominantSide && dominantSide.trim() !== 'none') {
            handleWinDeclaration(dominantSide);
        } else {
            setShowSuperiorityVote(true);
        }
    };

    const handleAction = (side, type, index, delta) => {
        updateScoreAndCheckRules(eventName, matchId, side, type, index, delta);
    };

    useEffect(() => {
        if (!visible) {
            setShowSuperiorityVote(false);
            return;
        }

        const initialTimer = matchData?.state?.timer || 0;
        const currentMinutes = Math.floor(initialTimer / 60);
        const currentSeconds = Math.floor(initialTimer % 60);
        const activePhase = matchData?.state?.matchPhase || 'FIGHTING';

        if (activePhase === 'FIGHTING' || activePhase === 'ROUND') {
            setMatchMin(currentMinutes);
            setMatchSec(currentSeconds);
        } else if (activePhase === 'REST') {
            setRestMin(currentMinutes);
            setRestSec(currentSeconds);
        }

        if (eventName && matchId) {
            const configRef = ref(database, `events/${eventName}/matches/${matchId}/config`);
            get(configRef).then((snapshot) => {
                if (!snapshot.exists()) return;
                const config = snapshot.val();
                const defaultMatchSec = config.rules?.roundDuration || 120;
                const defaultRestSec = config.rules?.restDuration || 60;

                if (activePhase === 'FIGHTING' || activePhase === 'ROUND') {
                    setRestMin(Math.floor(defaultRestSec / 60));
                    setRestSec(defaultRestSec % 60);
                } else if (activePhase === 'REST') {
                    setMatchMin(Math.floor(defaultMatchSec / 60));
                    setMatchSec(defaultMatchSec % 60);
                }
            });
        }
    }, [visible, eventName, matchId, matchData]);

    const handleTimeUpdate = (timeType, newMin, newSec) => {
        if (!eventName || !matchId) return;

        const totalSeconds = parseInt(newMin, 10) * 60 + parseInt(newSec, 10);
        const stateRef = ref(database, `events/${eventName}/matches/${matchId}/state`);

        const updates = {
            timer: totalSeconds,
            isPaused: true,
            lastStartTime: null,
            isFinished: totalSeconds === 0,
        };

        get(stateRef).then(snapshot => {
            if (snapshot.exists()) {
                const stateData = snapshot.val();
                const currentPhase = stateData.phase || 'FIGHTING';

                if (timeType === 'match' && (currentPhase === 'FIGHTING' || currentPhase === 'ROUND')) {
                    update(stateRef, updates);
                } else if (timeType === 'rest' && currentPhase === 'REST') {
                    update(stateRef, updates);
                }
            }
        });
    };
    
    const handleMatchMinChange = (value) => {
        setMatchMin(value);
        handleTimeUpdate('match', value, matchSec);
    };

    const handleMatchSecChange = (value) => {
        setMatchSec(value);
        handleTimeUpdate('match', matchMin, value);
    };

    const handleRestMinChange = (value) => {
        setRestMin(value);
        handleTimeUpdate('rest', value, restSec);
    };

    const handleRestSecChange = (value) => {
        setRestSec(value);
        handleTimeUpdate('rest', restMin, value);
    };

    const buttonFontSize = '1.5dvw';
    const pointTypes = [
        { name: "Gam-jeom", type: "gamjeom", index: null },
        { name: "Punch", type: "pointsStat", index: 0 },
        { name: "Body", type: "pointsStat", index: 1 },
        { name: "Head", type: "pointsStat", index: 2 },
        { name: "Body(Turn)", type: "pointsStat", index: 3 },
        { name: "Head(Turn)", type: "pointsStat", index: 4 }
    ];

    if (!matchData) return null;

    const { matchPhase, isFinished, winReason, roundWins } = matchData.state || {};

    const getWinner = () => {
        if (roundWins?.red > roundWins?.blue) return 'red';
        if (roundWins?.blue > roundWins?.red) return 'blue';
        return null;
    };
    const winner = getWinner();

    return (
        <div className={`edit-bar ${visible ? 'visible' : ''}`}>
            <div className="edit-grid">
                 <div className="grid-cell header"></div>
                {pointTypes.map(pt => <div className="grid-cell header" key={pt.name}>{pt.name}</div>)}

                <div className="grid-cell side-label blue">Blue</div>
                {pointTypes.map(pt => (
                    <div className="grid-cell" key={`blue-${pt.name}`}>
                        <div className="buttons">
                            <Button text="+" fontSize={buttonFontSize} onClick={() => handleAction('blue', pt.type, pt.index, 1)} angle={220} />
                            <Button text="−" fontSize={buttonFontSize} onClick={() => handleAction('blue', pt.type, pt.index, -1)} angle={220} />
                        </div>
                    </div>
                ))}

                <div className="grid-cell side-label red">Red</div>
                {pointTypes.map(pt => (
                    <div className="grid-cell" key={`red-${pt.name}`}>
                        <div className="buttons">
                            <Button text="+" fontSize={buttonFontSize} onClick={() => handleAction('red', pt.type, pt.index, 1)} angle={0} />
                            <Button text="−" fontSize={buttonFontSize} onClick={() => handleAction('red', pt.type, pt.index, -1)} angle={0} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="time-bar">
                <div className='time-control-group'>
                    <h2>Match Time</h2>
                    <div className="time-selects">
                        <select value={matchMin} onChange={(e) => handleMatchMinChange(e.target.value)}>
                            {[0, 1, 2].map(min => <option key={min} value={min}>{min}</option>)}
                        </select> min
                        <select value={matchSec} onChange={(e) => handleMatchSecChange(e.target.value)}>
                            {Array.from({ length: 60 }, (_, i) => i).map(sec => <option key={sec} value={sec}>{sec}</option>)}
                        </select> sec
                    </div>
                </div>
                <div className='time-control-group'>
                    <h2>Rest Time</h2>
                    <div className="time-selects">
                        <select value={restMin} onChange={(e) => handleRestMinChange(e.target.value)}>
                            {[0, 1].map(min => <option key={min} value={min}>{min}</option>)}
                        </select> min
                        <select value={restSec} onChange={(e) => handleRestSecChange(e.target.value)}>
                            {Array.from({ length: 60 }, (_, i) => i).map(sec => <option key={sec} value={sec}>{sec}</option>)}
                        </select> sec
                    </div>
                </div>

                {matchPhase === 'REST' && !isFinished && (
                    <Button 
                        text={`Start Round ${(matchData?.state?.currentRound || 1) + 1}`} 
                        fontSize="1.8vw" 
                        onClick={handleStartNextRound} 
                        angle={50} 
                    />
                )}

                {isFinished && winner && (
                    <div style={{
                        padding: '15px', 
                        border: '1px solid #4CAF50', 
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.5)'
                    }}>
                        <h3 style={{color: '#4CAF50', margin: '0 0 10px 0'}}>
                            {winReason} - {winner.toUpperCase()} Wins
                        </h3>
                        
                        <Button 
                            onClick={() => promoteWinner(eventName, matchId, winner)}
                            text="🚀 Promote Winner"
                            style={{
                                backgroundColor: '#4CAF50', 
                                color: 'white',
                                fontSize: '1.2rem',
                                padding: '15px 30px'
                            }}
                        />
                        
                        <div style={{marginTop: '10px', color: '#ccc', fontSize: '0.9rem'}}>
                            Next: {matchData?.config?.nextMatchId}
                        </div>
                    </div>
                )}

                 {!isFinished && matchPhase !== 'REST' && !showSuperiorityVote && (
                    <Button text="Declare Round Winner" fontSize="1.8vw" onClick={handleDeclareWinner} angle={50} />
                )}
                
                {showSuperiorityVote && (
                    <div className="superiority-vote time-control-group">
                        <h2>Woo-se-girok</h2>
                        <div className="buttons">
                            <Button text="Blue" fontSize="1.8vw" onClick={() => handleWinDeclaration('blue')} angle={220} />
                            <Button text="Red" fontSize="1.8vw" onClick={() => handleWinDeclaration('red')} angle={0} />
                        </div>
                    </div>
                )}

                <Button text="Done" fontSize="2vw" onClick={() => setVisible(false)} />
            </div>
        </div>
    );
}

export default Edit;
