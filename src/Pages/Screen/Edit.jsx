import React, { useEffect, useState } from 'react';
import { database } from '../../firebase';
import { ref, runTransaction, get, update } from "firebase/database";
import "./Edit.css";
import Button from "../../Components/Button/Button";

const Edit = ({ visible, setVisible, eventName, matchId, initialTimer, phase }) => {
    const [matchMin, setMatchMin] = useState(0);
    const [matchSec, setMatchSec] = useState(0);
    const [restMin, setRestMin] = useState(0);
    const [restSec, setRestSec] = useState(0);

    useEffect(() => {
        if (visible && eventName && matchId) {
            const configRef = ref(database, `events/${eventName}/matches/${matchId}/config`);
            get(configRef).then((snapshot) => {
                if (!snapshot.exists()) return;
                const config = snapshot.val();
                const defaultMatchSec = config.rules?.roundDuration || 120;
                const defaultRestSec = config.rules?.restDuration || 60;

                if (phase === 'ROUND') {
                    setRestMin(Math.floor(defaultRestSec / 60));
                    setRestSec(defaultRestSec % 60);
                } else {
                    setMatchMin(Math.floor(defaultMatchSec / 60));
                    setMatchSec(defaultMatchSec % 60);
                }
            });

            const currentMinutes = Math.floor(initialTimer / 60);
            const currentSeconds = Math.floor(initialTimer % 60);

            if (phase === 'ROUND') {
                setMatchMin(currentMinutes);
                setMatchSec(currentSeconds);
            } else {
                setRestMin(currentMinutes);
                setRestSec(currentSeconds);
            }
        }
    }, [visible, eventName, matchId, initialTimer, phase]);

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
                if (timeType === 'match' && stateData.phase === 'ROUND') {
                    update(stateRef, updates);
                } else if (timeType === 'rest' && stateData.phase === 'REST') {
                    update(stateRef, updates);
                }
            }
        });
    };

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

    return (
        <div className={`edit-bar ${visible ? 'visible' : ''}`}>
            <div className="edit-grid">
                {/* Row 1: Titles */}
                <div className="grid-cell header"></div>
                {pointTypes.map(pt => (
                    <div className="grid-cell header" key={pt.name}>{pt.name}</div>
                ))}

                {/* Row 2: Blue Controls */}
                <div className="grid-cell side-label blue">Blue</div>
                {pointTypes.map(pt => (
                    <div className="grid-cell" key={`blue-${pt.name}`}>
                        <div className="buttons">
                            <Button text="+" fontSize={buttonFontSize} onClick={() => updateStat('blue', pt.type, pt.index, 1)} angle={220} />
                            <Button text="−" fontSize={buttonFontSize} onClick={() => updateStat('blue', pt.type, pt.index, -1)} angle={220} />
                        </div>
                    </div>
                ))}

                {/* Row 3: Red Controls */}
                <div className="grid-cell side-label red">Red</div>
                {pointTypes.map(pt => (
                    <div className="grid-cell" key={`red-${pt.name}`}>
                        <div className="buttons">
                            <Button text="+" fontSize={buttonFontSize} onClick={() => updateStat('red', pt.type, pt.index, 1)} angle={0} />
                            <Button text="−" fontSize={buttonFontSize} onClick={() => updateStat('red', pt.type, pt.index, -1)} angle={0} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Row 4: Time Controls */}
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
                <Button text="Done" fontSize="2vw" onClick={() => setVisible(false)} />
            </div>
        </div>
    );
}

export default Edit;
