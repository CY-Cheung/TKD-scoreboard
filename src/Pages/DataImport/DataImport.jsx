import React, { useState, useEffect } from 'react';
import { ref, set, get } from "firebase/database";
import { database } from '../../firebase';
import './DataImport.css';
import Squares from '../../Components/Squares/Squares';
import Button from '../../Components/Button/Button';
import { useNavigate } from 'react-router-dom';

// A helper function to parse name and club
const parseName = (fullName) => {
    if (!fullName) return { name: '', club: '' };
    const match = fullName.match(/(.+?)\s*\((.+)\)/);
    if (match) {
        return { name: match[1].trim(), club: match[2].trim() };
    }
    return { name: fullName, club: '' };
};

const DataImport = () => {
    const navigate = useNavigate();
    const [eventName, setEventName] = useState('');
    const [eventsList, setEventsList] = useState([]);
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
    const [blueAffiliatedClub, setBlueAffiliatedClub] = useState('');
    const [blueSourceMatchId, setBlueSourceMatchId] = useState('');
    const [redName, setRedName] = useState('');
    const [redAffiliatedClub, setRedAffiliatedClub] = useState('');
    const [redSourceMatchId, setRedSourceMatchId] = useState('');

    useEffect(() => {
        const eventsRef = ref(database, 'events');
        get(eventsRef).then((snapshot) => {
            if (snapshot.exists()) {
                setEventsList(Object.keys(snapshot.val()));
            }
        });
    }, []);

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

    useEffect(() => {
        // Helper function to reset form fields for a new match
        const resetFormFields = () => {
            setCourtId('court1');
            setNextMatchId('');
            setNextMatchSlot('');
            setMaxPointGap(12);
            setMaxGamjeom(5);
            setRoundDuration(120);
            setRestDuration(60);
            setBlueName('');
            setBlueAffiliatedClub('');
            setBlueSourceMatchId('');
            setRedName('');
            setRedAffiliatedClub('');
            setRedSourceMatchId('');
        };
    
        if (matchId && currentMatches[matchId]) {
            const matchData = currentMatches[matchId];
            const config = matchData.config;
            const rules = config.rules;
            const competitors = config.competitors;
    
            // Populate form fields with data from the selected match
            setCourtId(config.courtId || 'court1');
            setNextMatchId(config.nextMatchId || '');
            setNextMatchSlot(config.nextMatchSlot || '');
            
            setMaxPointGap(rules.maxPointGap || 12);
            setMaxGamjeom(rules.maxGamjeom || 5);
            setRoundDuration(rules.roundDuration || 120);
            setRestDuration(rules.restDuration || 60);
    
            const bluePlayer = parseName(competitors.blue.name);
            setBlueName(bluePlayer.name);
            setBlueAffiliatedClub(bluePlayer.club);
            setBlueSourceMatchId(competitors.blue.sourceMatchId || '');
    
            const redPlayer = parseName(competitors.red.name);
            setRedName(redPlayer.name);
            setRedAffiliatedClub(redPlayer.club);
            setRedSourceMatchId(competitors.red.sourceMatchId || '');
    
        } else {
            // If matchId is new or cleared, don't auto-reset fields
            // The user might be typing a new one
        }
    }, [matchId, currentMatches]);

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
                    settings: {},
                    courts: {
                        court1: { name: 'Court 1', currentMatchId: '' },
                        court2: { name: 'Court 2', currentMatchId: '' },
                        court3: { name: 'Court 3', currentMatchId: '' },
                        court4: { name: 'Court 4', currentMatchId: '' }
                    },
                    judgingQueue: {},
                    matches: {}
                };
                await set(eventRef, initialEventData);
            }
            
            const finalBlueName = blueAffiliatedClub ? `${blueName} (${blueAffiliatedClub})` : blueName;
            const finalRedName = redAffiliatedClub ? `${redName} (${redAffiliatedClub})` : redName;

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
                        blue: { name: finalBlueName, sourceMatchId: blueSourceMatchId || null },
                        red: { name: finalRedName, sourceMatchId: redSourceMatchId || null },
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

            // Clear inputs after successful submission
            setMatchId('');
            setBlueName('');
            setBlueAffiliatedClub('');
            setRedName('');
            setRedAffiliatedClub('');
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

                const screenDisplayRef = ref(database, targetCourt);
                const courtEventRef = ref(database, `events/${eventName}/courts/${targetCourt}/currentMatchId`);
                
                const screenFormattedData = {
                    ...matchData
                };
                
                await set(screenDisplayRef, screenFormattedData);
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
                    <div className="di-form-section">
                        <h2>Import Event Data</h2>
                        <div className="form-group">
                            <label htmlFor="eventName">Event Name</label>
                            <input list="events-list" type="text" id="eventName" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g., BlackBelt2025" />
                            <datalist id="events-list">
                                {eventsList.map(event => (
                                    <option key={event} value={event} />
                                ))}
                            </datalist>
                        </div>
                        <div className="match-form">
                            <fieldset>
                                <legend>Match Configuration</legend>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Match ID</label>
                                        <input list="match-ids" type="text" value={matchId} onChange={e => setMatchId(e.target.value)} placeholder="A1001" />
                                        <datalist id="match-ids">
                                            {Object.keys(currentMatches).map(mId => (
                                                <option key={mId} value={mId} />
                                            ))}
                                        </datalist>
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
                                            <label>Affiliated Club</label>
                                            <input type="text" value={blueAffiliatedClub} onChange={e => setBlueAffiliatedClub(e.target.value)} placeholder="Club (optional)" />
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
                                            <label>Affiliated Club</label>
                                            <input type="text" value={redAffiliatedClub} onChange={e => setRedAffiliatedClub(e.target.value)} placeholder="Club (optional)" />
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

                    <div className="di-matches-section">
                        <div className="matches-list">
                            <h3>Matches in {eventName || 'Event'}</h3>
                            <ul>
                                {Object.keys(currentMatches).map(mId => (
                                    <li key={mId} onClick={() => setSelectedMatchId(mId)} className={selectedMatchId === mId ? 'selected' : ''}>
                                        <strong>{mId}:</strong> {currentMatches[mId].config.competitors.blue.name} vs {currentMatches[mId].config.competitors.red.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="di-action-buttons">
                    <Button text="Add Match" fontSize="2dvw" angle={260} onClick={handleAddMatch} />
                    <Button text="Load to Screen" fontSize="2dvw" angle={40} onClick={selectedMatchId ? handleLoadMatch : null} disabled={!selectedMatchId} />
                    <Button text="Back to Home" fontSize="2dvw" angle={150} onClick={() => navigate('/')} />
                </div>
            </div>
        </div>
    );
};

export default DataImport;
