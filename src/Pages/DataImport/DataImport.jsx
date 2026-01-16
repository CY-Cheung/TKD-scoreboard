import React, { useState, useEffect } from 'react';
import './DataImport.css';

const DataImport = () => {
    const [eventName, setEventName] = useState('');
    const [currentMatches, setCurrentMatches] = useState({});

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
        const data = localStorage.getItem('TKD.json');
        if (data && eventName) {
            const parsedData = JSON.parse(data);
            setCurrentMatches(parsedData.events?.[eventName]?.matches || {});
        } else {
            setCurrentMatches({});
        }
    }, [eventName]);

    const handleAddMatch = () => {
        if (!eventName || !matchId) {
            alert('Please provide an Event Name and a Match ID.');
            return;
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
                roundWins: [0, 0],
                blue: { pointsStat: [0, 0, 0, 0, 0], gamjeom: 0 },
                red: { pointsStat: [0, 0, 0, 0, 0], gamjeom: 0 },
            },
        };

        const rawData = localStorage.getItem('TKD.json');
        const existingData = rawData ? JSON.parse(rawData) : { events: {} };

        const eventData = existingData.events?.[eventName] || {
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

        eventData.matches[matchId] = newMatch;
        
        if (!existingData.events) {
            existingData.events = {};
        }
        existingData.events[eventName] = eventData;

        localStorage.setItem('TKD.json', JSON.stringify(existingData, null, 2));
        
        setCurrentMatches(eventData.matches);
        alert(`Match ${matchId} added to event ${eventName}!`);

        // Clear form for next entry
        setMatchId('');
        setBlueName('');
        setRedName('');
        setNextMatchId('');
        setNextMatchSlot('');
        setBlueSourceMatchId('');
        setRedSourceMatchId('');
    };

    return (
        <div className="data-import-container">
            <h2>Import Event Data</h2>

            <div className="form-group">
                <label htmlFor="eventName">Event Name</label>
                <input
                    type="text" id="eventName" value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="e.g., BlackBelt2025"
                />
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

                <button onClick={handleAddMatch} className="add-match-btn">Add Match</button>
            </div>
            
            <div className="matches-list">
                <h3>Matches in {eventName || 'Current Event'}</h3>
                <ul>
                    {Object.keys(currentMatches).map(mId => (
                        <li key={mId}>
                            <strong>{mId}:</strong> {currentMatches[mId].config.competitors.red.name} (Red) vs {currentMatches[mId].config.competitors.blue.name} (Blue)
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default DataImport;
