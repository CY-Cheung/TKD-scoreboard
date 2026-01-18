import React, { useState, useEffect } from 'react';
import { useAuth } from '../../Context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { database } from '../../firebase';
import { ref, onValue } from 'firebase/database';

import './Controller.css';
import Button from '../../Components/Button/Button';
import Squares from '../../Components/Squares/Squares';

function Controller() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [matchData, setMatchData] = useState(null);

    useEffect(() => {
        if (user) {
            const matchDataRef = ref(database, `events/${user.eventId}/matches/${user.courtId}`);
            const unsubscribe = onValue(matchDataRef, (snapshot) => {
                const data = snapshot.val();
                setMatchData(data);
            });

            return () => unsubscribe();
        }
    }, [user]);

    return (
        <div className="controller-container">
            <Squares
                speed={0.5}
                squareSize={100}
                direction="diagonal"
                borderColor="hsla(270, 50%, 50%, 0.25)"
                hoverFillColor="hsla(60, 50%, 50%, 0.25)"
            />

            <div className="controller-content">
                {matchData ? (
                    <>
                        <div className="match-info">
                            <h1>{matchData.category}</h1>
                            <p>Match {matchData.matchNumber}</p>
                        </div>
                        <div className="competitors">
                            <div className="competitor-hong">
                                <h2>{matchData.hong.name}</h2>
                                <p>{matchData.hong.team}</p>
                            </div>
                            <div className="vs">VS</div>
                            <div className="competitor-chung">
                                <h2>{matchData.chung.name}</h2>
                                <p>{matchData.chung.team}</p>
                            </div>
                        </div>
                        <div className="controller-actions">
                           <Button text="Back to Menu" fontSize="2dvw" angle={120} onClick={() => navigate('/')} />
                           <Button text="Referee Login" fontSize="2dvw" angle={240} onClick={() => navigate('/referee/login')} />
                        </div>
                    </>
                ) : (
                    <div className="loading-state">
                        <h1>Waiting for match data...</h1>
                        <p>Ensure event and court are correctly set up.</p>
                        <Button text="Back to Menu" fontSize="2dvw" angle={180} onClick={() => navigate('/')} />
                    </div>
                )}
            </div>
        </div>
    );
}

export default Controller;
