import React, { useState, useEffect } from 'react';
import { ref, set, get } from "firebase/database";
import { database } from '../../firebase';
import './DataImport.css';
import Squares from '../../Components/Squares/Squares';
import Button from '../../Components/Button/Button';

const DataImport = () => {
    const [eventName, setEventName] = useState('');
    const [currentMatches, setCurrentMatches] = useState({});
    const [selectedMatchId, setSelectedMatchId] = useState(null);

    // Form state
    const [matchId, setMatchId] = useState('');
    const [courtId, setCourtId] = useState('court1');
    const [nextMatchId, setNextMatchId] = useState('');
    const [nextMatchSlot, setNextMatchSlot] = useState('');
    const [maxPointGap, setMaxPointGap] = useState(12);
    const [maxGamjeom, setMaxGamjeom] = useState(5);
    const [roundDuration, setRoundDuration] = useState(120);
    const [restDuration, setRestDuration] = useState(60);
    const [blueName, setBlueName] = useState('');
    const [blueSourceMatchId, setBlueSourceMatchId] = useState('');
    const [redName, setRedName] = useState('');
    const [redSourceMatchId, setRedSourceMatchId] = useState('');

    useEffect(() => {
        setSelectedMatchId(null);
        if (eventName) {
            const matchesRef = ref(database, `events/${eventName}/matches`);
            get(matchesRef).then((snapshot) => {
                if (snapshot.exists()) {
                    setCurrentMatches(snapshot.val());
                } else {
                    setCurrentMatches({});
                }
            });
        } else {
            setCurrentMatches({});
        }
    }, [eventName]);

    const handleAddMatch = async () => {
        if (!eventName || !matchId) {
            alert('Please provide an Event Name and a Match ID.');
            return;
        }

        try {
            const eventRef = ref(database, `events/${eventName}`);
            const eventSnapshot = await get(eventRef);

            if (!eventSnapshot.exists()) {
                const initialEventData = {
                    settings: { setupPassword: `${eventName.toLowerCase().replace(/\s+/g, '-')}@2025` },
                    courts: {
                        court1: { name: 'Court 1', currentMatchId: '', accessKey: 'temp_referee_key_123' },
                        court2: { name: 'Court 2', currentMatchId: '', accessKey: 'temp_referee_key_123' },
                        court3: { name: 'Court 3', currentMatchId: '', accessKey: 'temp_referee_key_123' },
                        court4: { name: 'Court 4', currentMatchId: '', accessKey: 'temp_referee_key_123' }
                    },
                    judgingQueue: {},
                    matches: {}
                };
                await set(eventRef, initialEventData);
            }
            
            const newMatch = {
                config: {
                    matchId: matchId,
                    courtId: courtId,
                    nextMatchId: nextMatchId || null,
                    nextMatchSlot: nextMatchSlot || null,
                    rules: {
                        maxPointGap: parseInt(maxPointGap, 10),
                        maxGamjeom: parseInt(maxGamjeom, 10),
                        roundDuration: parseInt(roundDuration, 10),
                        restDuration: parseInt(restDuration, 10),
                    },
                    competitors: {
                        blue: { name: blueName, sourceMatchId: blueSourceMatchId || null },
                        red: { name: redName, sourceMatchId: redSourceMatchId || null },
                    },
                },
                state: { 
                    isStarted: false, isPaused: true, isFinished: false,
                    currentRound: 1, timer: parseInt(roundDuration, 10),
                    winnerSide: null, phase: 'ROUND',
                },
                stats: { 
                    roundWins: [0,0], 
                    blue: { pointsStat: [0,0,0,0,0], gamjeom: 0 }, 
                    red: { pointsStat: [0,0,0,0,0], gamjeom: 0 } 
                }
            };

            const matchRef = ref(database, `events/${eventName}/matches/${matchId}`);
            await set(matchRef, newMatch);
            
            alert(`Match ${matchId} added to event ${eventName} in Firebase!`);
            setCurrentMatches(prev => ({...prev, [matchId]: newMatch}));

            setMatchId('');
            setBlueName('');
            setRedName('');
            setNextMatchId('');
            setNextMatchSlot('');
            setBlueSourceMatchId('');
            setRedSourceMatchId('');

        } catch (error) {
            console.error("Error writing to Firebase:", error);
            alert(`Failed to add match to Firebase. See console for details.`);
        }
    };

    const handleLoadMatch = async () => {
        if (!eventName || !selectedMatchId) {
            alert('Please select an event and a match to load.');
            return;
        }
        try {
            const matchDataRef = ref(database, `events/${eventName}/matches/${selectedMatchId}`);
            const matchSnapshot = await get(matchDataRef);
    
            if (matchSnapshot.exists()) {
                const matchData = matchSnapshot.val();
                const targetCourt = matchData.config.courtId || 'court1';

                // Define the path the Screen.jsx is listening to
                const screenDisplayRef = ref(database, targetCourt);

                // Also update the currentMatchId in the event's court data for consistency
                const courtEventRef = ref(database, `events/${eventName}/courts/${targetCourt}/currentMatchId`);
                
                // Re-structure data to fit what Screen.jsx expects
                const screenFormattedData = {
                    ...matchData // Send the whole match data
                };
                
                // Write the full match data to the path the screen is listening to
                await set(screenDisplayRef, screenFormattedData);
                // Update the reference in the event data structure
                await set(courtEventRef, selectedMatchId);

                alert(`Match ${selectedMatchId} loaded to ${targetCourt}!`);
            } else {
                alert('Could not find the selected match data.');
            }
    
        } catch (error) {
            console.error("Error loading match to screen:", error);
            alert('Failed to load match. Check console for details.');
        }
    };

    return (
        <div className="di-container">
            <Squares speed={0.2} squareSize={80} borderColor="hsla(270, 50%, 50%, 0.25)" hoverFillColor="hsla(270, 50%, 50%, 0.1)" />
            <div className="di-content-wrapper">

                <div className="di-form-and-list-container">
                    {/* Form Section */}
                    <div className="di-form-section">
                        <h2>Import Event Data</h2>
                        <div className="form-group">
                            <label htmlFor="eventName">Event Name</label>
                            <input type="text" id="eventName" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g., BlackBelt2025" />
                        </div>
                        <div className="match-form">
                            <fieldset>
                                <legend>Match Configuration</legend>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Match ID</label>
                                        <input type="text" value={matchId} onChange={e => setMatchId(e.target.value)} placeholder="A1001" />
                                    </div>
                                    <div className="form-group">
                                        <label>Court ID</label>
                                        <input type="text" value={courtId} onChange={e => setCourtId(e.target.value)} placeholder="court1" />
                                    </div>
                                    <div className="form-group">
                                        <label>Next Match ID</label>
                                        <input type="text" value={nextMatchId} onChange={e => setNextMatchId(e.target.value)} placeholder="e.g. A2001 (optional)" />
                                    </div>
                                    <div className="form-group">
                                        <label>Next Match Slot</label>
                                        <input type="text" value={nextMatchSlot} onChange={e => setNextMatchSlot(e.target.value)} placeholder="blue or red (optional)" />
                                    </div>
                                </div>
                            </fieldset>

                            <fieldset>
                                <legend>Rules</legend>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Max Point Gap</label>
                                        <input type="number" value={maxPointGap} onChange={e => setMaxPointGap(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Max Gam-jeom</label>
                                        <input type="number" value={maxGamjeom} onChange={e => setMaxGamjeom(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Round Duration (s)</label>
                                        <input type="number" value={roundDuration} onChange={e => setRoundDuration(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Rest Duration (s)</label>
                                        <input type="number" value={restDuration} onChange={e => setRestDuration(e.target.value)} />
                                    </div>
                                </div>
                            </fieldset>

                            <fieldset>
                                <legend>Competitors</legend>
                                <div className="competitor-grid">
                                    <div className="competitor-group blue">
                                        <h3>Blue</h3>
                                        <div className="form-group">
                                            <label>Name</label>
                                            <input type="text" value={blueName} onChange={e => setBlueName(e.target.value)} placeholder="Blue Player Name" />
                                        </div>
                                        <div className="form-group">
                                            <label>Source Match ID</label>
                                            <input type="text" value={blueSourceMatchId} onChange={e => setBlueSourceMatchId(e.target.value)} placeholder="Source Match (optional)" />
                                        </div>
                                    </div>
                                    <div className="competitor-group red">
                                        <h3>Red</h3>
                                        <div className="form-group">
                                            <label>Name</label>
                                            <input type="text" value={redName} onChange={e => setRedName(e.target.value)} placeholder="Red Player Name" />
                                        </div>
                                        <div className="form-group">
                                            <label>Source Match ID</label>
                                            <input type="text" value={redSourceMatchId} onChange={e => setRedSourceMatchId(e.target.value)} placeholder="Source Match (optional)" />
                                        </div>
                                    </div>
                                </div>
                            </fieldset>
                        </div>
                    </div>

                    {/* Matches List Section */}
                    <div className="di-matches-section">
                        <div className="matches-list">
                            <h3>Matches in {eventName || 'Event'}</h3>
                            <ul>
                                {Object.keys(currentMatches).map(mId => (
                                    <li key={mId} onClick={() => setSelectedMatchId(mId)} className={selectedMatchId === mId ? 'selected' : ''}>
                                        <strong>{mId}:</strong> {currentMatches[mId].config.competitors.red.name} vs {currentMatches[mId].config.competitors.blue.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Action Buttons at the bottom */}
                <div className="di-action-buttons">
                    <Button text="Add Match" fontSize="2dvw" angle={0} onClick={handleAddMatch} />
                    <Button text="Load to Screen" fontSize="2dvw" angle={0} onClick={selectedMatchId ? handleLoadMatch : null} disabled={!selectedMatchId} />
                </div>
            </div>
        </div>
    );
};

export default DataImport;
