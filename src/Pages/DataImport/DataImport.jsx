import React, { useState, useEffect } from 'react';
import { ref, set, get, update } from "firebase/database";
import { database } from '../../firebase';
import './DataImport.css';
import Squares from '../../Components/Squares/Squares';
import Button from '../../Components/Button/Button';
import { useNavigate } from 'react-router-dom';

// A helper function to parse name and club from old format
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

    // Auto-populates the form when a match ID is entered manually
    useEffect(() => {
        if (matchId && currentMatches[matchId]) {
            const matchData = currentMatches[matchId];
            const config = matchData.config;
            const rules = config.rules;
            const competitors = config.competitors;
    
            setNextMatchId(config.nextMatchId || '');
            setNextMatchSlot(config.nextMatchSlot || '');
            
            setMaxPointGap(rules.maxPointGap || 12);
            setMaxGamjeom(rules.maxGamjeom || 5);
            setRoundDuration(rules.roundDuration || 120);
            setRestDuration(rules.restDuration || 60);
    
            const blueCompetitor = competitors.blue;
            if (blueCompetitor.affiliatedClub !== undefined) {
                setBlueName(blueCompetitor.name || '');
                setBlueAffiliatedClub(blueCompetitor.affiliatedClub || '');
            } else {
                const bluePlayer = parseName(blueCompetitor.name);
                setBlueName(bluePlayer.name);
                setBlueAffiliatedClub(bluePlayer.club);
            }
            setBlueSourceMatchId(blueCompetitor.sourceMatchId || '');
    
            const redCompetitor = competitors.red;
            if (redCompetitor.affiliatedClub !== undefined) {
                setRedName(redCompetitor.name || '');
                setRedAffiliatedClub(redCompetitor.affiliatedClub || '');
            } else {
                const redPlayer = parseName(redCompetitor.name);
                setRedName(redPlayer.name);
                setRedAffiliatedClub(redPlayer.club);
            }
            setRedSourceMatchId(redCompetitor.sourceMatchId || '');
    
        }
    }, [matchId, currentMatches]);

    // Bridge: When a match is selected from the list, update the matchId state.
    // This will trigger the useEffect above to populate the form.
    useEffect(() => {
        if (selectedMatchId) {
            setMatchId(selectedMatchId);
        }
    }, [selectedMatchId]);

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
            
            const newMatch = {
                config: {
                    matchId: matchId,
                    nextMatchId: nextMatchId || null,
                    nextMatchSlot: nextMatchSlot || null,
                    rules: {
                        maxPointGap: parseInt(maxPointGap, 10),
                        maxGamjeom: parseInt(maxGamjeom, 10),
                        roundDuration: parseInt(roundDuration, 10),
                        restDuration: parseInt(restDuration, 10),
                    },
                    competitors: {
                        blue: { 
                            name: blueName, 
                            affiliatedClub: blueAffiliatedClub || '', 
                            sourceMatchId: blueSourceMatchId || null 
                        },
                        red: { 
                            name: redName, 
                            affiliatedClub: redAffiliatedClub || '',
                            sourceMatchId: redSourceMatchId || null
                        },
                    },
                },
                state: { 
                    isStarted: false, isPaused: true, isFinished: false,
                    currentRound: 1, timer: parseInt(roundDuration, 10),
                    winnerSide: null, phase: 'ROUND',
                    winReason: null   // 新增欄位
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
    
        const courtId = localStorage.getItem('selectedCourt');
        if (!courtId) {
            alert('No court is configured for this device. Please go to Court Setup first.');
            return;
        }
    
        try {
            const courtMatchIdRef = ref(database, `events/${eventName}/courts/${courtId}/currentMatchId`);
            await set(courtMatchIdRef, selectedMatchId);
    
            localStorage.setItem('selectedEvent', eventName);
            localStorage.setItem('selectedMatchId', selectedMatchId);
            
            alert(`Match ${selectedMatchId} successfully loaded to ${courtId}.`);
    
        } catch (error) {
            console.error("Error loading match to court:", error);
            alert(`Failed to load match to court. See console for details.`);
        }
    };

    return (
        <div className="di-container">
            <Squares
				speed={0.5}
				squareSize={100}
				direction="diagonal"
				borderColor="hsla(270, 50%, 50%, 0.25)"
				hoverFillColor="hsla(60, 50%, 50%, 0.25)"
			/>
            <div className="di-content-wrapper">

                <div className="di-form-and-list-container">
                    <div className="di-form-section">
                        <h2>Import Event Data</h2>
                        <div className="form-group">
                            <label htmlFor="eventName-select">Event Name</label>
                            <select 
                                id="eventName-select"
                                value={eventName}
                                onChange={(e) => setEventName(e.target.value)}
                                required
                            >
                                <option value="" disabled>-- Please select an event --</option>
                                {eventsList.map(event => (
                                    <option key={event} value={event}>{event}</option>
                                ))}
                            </select>
                        </div>
                        <div className="match-form">
                            <fieldset>
                                <legend>Match Configuration</legend>
                                <div className="fieldset-content">
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
                                        <label>Next Match ID</label>
                                        <input type="text" value={nextMatchId} onChange={e => setNextMatchId(e.target.value)} placeholder="e.g. A2001 (optional)" />
                                    </div>
                                    <div className="form-group">
                                        <label>Next Match Slot</label>
                                        <select value={nextMatchSlot || ''} onChange={e => setNextMatchSlot(e.target.value)}>
                                            <option value="">(optional)</option>
                                            <option value="blue">Blue</option>
                                            <option value="red">Red</option>
                                        </select>
                                    </div>
                                </div>
                            </fieldset>

                            <fieldset>
                                <legend>Rules</legend>
                                <div className="fieldset-content">
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

                            <fieldset className="competitor-group blue">
                                <legend>Blue Competitor</legend>
                                <div className="fieldset-content">
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
                            </fieldset>
                            
                            <fieldset className="competitor-group red">
                                <legend>Red Competitor</legend>
                                <div className="fieldset-content">
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
                            </fieldset>
                        </div>
                        <div className="di-action-buttons">
                            <Button text="Add Match" fontSize="1.5dvw" angle={260} onClick={handleAddMatch} />
                            <Button text="Load to Screen" fontSize="1.5dvw" angle={40} onClick={selectedMatchId ? handleLoadMatch : null} disabled={!selectedMatchId} />
                            <Button text="Back to Home" fontSize="1.5dvw" angle={150} onClick={() => navigate('/')} />
                        </div>
                    </div>

                    <div className="di-matches-section">
                        <div className="matches-list">
                            <h3>Matches in {eventName || 'Event'}</h3>
                            <ul>
                                {Object.keys(currentMatches).map(mId => {
                                    const blue = currentMatches[mId].config.competitors.blue;
                                    const red = currentMatches[mId].config.competitors.red;

                                    const getDisplayText = (competitor) => {
                                        if (competitor.affiliatedClub) {
                                            return `${competitor.name} (${competitor.affiliatedClub})`;
                                        }
                                        return competitor.name;
                                    };

                                    return (
                                        <li key={mId} onClick={() => setSelectedMatchId(mId)} className={selectedMatchId === mId ? 'selected' : ''}>
                                            <strong>{mId}:</strong> {`${getDisplayText(blue)} vs ${getDisplayText(red)}`}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataImport;
