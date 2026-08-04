import React, { useState, useEffect } from 'react';
import { ref, set, get, remove } from "firebase/database";
import { database } from '../../firebase';
import './DataImport.css';
import Squares from '../../Components/Squares/Squares';
import Button from '../../Components/Button/Button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { PlusCircle, Trash, FolderPlus, ExclamationTriangle } from 'react-bootstrap-icons';

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
    const { session, user } = useAuth(); 
    const [eventsList, setEventsList] = useState([]);
    const [eventName, setEventName] = useState('');
    const [currentMatches, setCurrentMatches] = useState({});
    const [selectedMatchId, setSelectedMatchId] = useState(null);

    // Create Event Modal State
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [newEventId, setNewEventId] = useState('');
    const [newEventName, setNewEventName] = useState('');
    const [newSetupPassword, setNewSetupPassword] = useState('BCB2026');

    // Delete Event Confirmation Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form state - Default Point Gap set to 15 as per new rules
    const [matchId, setMatchId] = useState('');
    const [nextMatchId, setNextMatchId] = useState('');
    const [nextMatchSlot, setNextMatchSlot] = useState('');
    const [maxPointGap, setMaxPointGap] = useState(15);
    const [maxGamjeom, setMaxGamjeom] = useState(5);
    const [roundDuration, setRoundDuration] = useState(120);
    const [restDuration, setRestDuration] = useState(60);
    const [blueName, setBlueName] = useState('');
    const [blueAffiliatedClub, setBlueAffiliatedClub] = useState('');
    const [bluePreviousMatch, setBluePreviousMatch] = useState('');
    const [redName, setRedName] = useState('');
    const [redAffiliatedClub, setRedAffiliatedClub] = useState('');
    const [redPreviousMatch, setRedPreviousMatch] = useState('');

    // Fetch All Events from Firebase
    const fetchEventsList = () => {
        const eventsRef = ref(database, 'events');
        get(eventsRef).then((snapshot) => {
            if (snapshot.exists()) {
                const val = snapshot.val();
                const list = Object.keys(val).map(key => {
                    const item = val[key];
                    return {
                        id: key,
                        displayName: item?.EventName || item?.eventName || key,
                        createdBy: item?.createdBy || null
                    };
                });
                setEventsList(list);

                // Set initial eventName from session or first available event
                if (!eventName) {
                    if (session?.eventId && val[session.eventId]) {
                        setEventName(session.eventId);
                    } else if (list.length > 0) {
                        setEventName(list[0].id);
                    }
                }
            } else {
                setEventsList([]);
                setEventName('');
            }
        }).catch(err => {
            console.error("Error fetching events list:", err);
        });
    };

    useEffect(() => {
        fetchEventsList();
    }, [session?.eventId]);

    // Fetch Matches when eventName changes
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
            }).catch(() => {
                setCurrentMatches({});
            });
        } else {
            setCurrentMatches({});
        }
    }, [eventName]);

    // Create New Event Handler
    const handleCreateEvent = async (e) => {
        e.preventDefault();
        if (!user) {
            alert('🔒 請先登入 Google 帳號，方可建立新賽事！');
            return;
        }

        const trimmedId = newEventId.trim();
        const trimmedName = newEventName.trim();

        if (!trimmedId || !trimmedName) {
            alert('請提供有效的 Event ID 與 Event Name！');
            return;
        }

        try {
            const eventRef = ref(database, `events/${trimmedId}`);
            await set(eventRef, {
                EventName: trimmedName,
                createdBy: user.uid,
                createdByEmail: user.email || '',
                createdAt: Date.now(),
                settings: {
                    setupPassword: newSetupPassword || 'BCB2026'
                },
                courts: {
                    court1: { name: 'court1', currentMatchId: '' }
                },
                matches: {}
            });

            alert(`✅ 成功建立賽事：${trimmedName} (${trimmedId})`);
            setNewEventId('');
            setNewEventName('');
            setNewSetupPassword('BCB2026');
            setShowCreateEventModal(false);
            setEventName(trimmedId);
            fetchEventsList();

        } catch (error) {
            console.error("Create Event Failed:", error);
            alert(`建立賽事失敗: ${error.message}`);
        }
    };

    // Prompt Delete Event Confirmation
    const promptDeleteEvent = () => {
        if (!eventName) {
            alert('請先選擇要刪除的賽事。');
            return;
        }

        if (!user) {
            alert('🔒 請先登入 Google 帳號！');
            return;
        }
        setShowDeleteModal(true);
    };

    // Confirm Delete Event Execution
    const confirmDeleteEvent = async () => {
        if (!eventName || !user) return;
        setIsDeleting(true);

        try {
            const eventRef = ref(database, `events/${eventName}`);
            await remove(eventRef);
            alert(`🗑️ 賽事 ${eventName} 已成功刪除！`);
            setShowDeleteModal(false);
            setEventName('');
            fetchEventsList();
        } catch (error) {
            console.error("Delete Event Failed:", error);
            alert(`刪除賽事失敗：只有該賽事的建立者或協作者可以刪除！\n(${error.message})`);
        } finally {
            setIsDeleting(false);
        }
    };

    // Auto-populates the form when a match ID is entered manually
    useEffect(() => {
        if (matchId && currentMatches[matchId]) {
            const matchData = currentMatches[matchId];
            const config = matchData.config;
            const rules = config.rules;
            const competitors = config.competitors;
    
            setNextMatchId(config.nextMatchId || '');
            setNextMatchSlot(config.nextMatchSlot || '');
            
            setMaxPointGap(rules.maxPointGap || 15);
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
            setBluePreviousMatch(blueCompetitor.previousMatch || '');
    
            const redCompetitor = competitors.red;
            if (redCompetitor.affiliatedClub !== undefined) {
                setRedName(redCompetitor.name || '');
                setRedAffiliatedClub(redCompetitor.affiliatedClub || '');
            } else {
                const redPlayer = parseName(redCompetitor.name);
                setRedName(redPlayer.name);
                setRedAffiliatedClub(redPlayer.club);
            }
            setRedPreviousMatch(redCompetitor.previousMatch || '');
    
        }
    }, [matchId, currentMatches]);

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
                            previousMatch: bluePreviousMatch || null 
                        },
                        red: { 
                            name: redName, 
                            affiliatedClub: redAffiliatedClub || '',
                            previousMatch: redPreviousMatch || null
                        },
                    },
                },
                state: { 
                    isStarted: false, isPaused: true, isFinished: false,
                    currentRound: 1, timer: parseInt(roundDuration, 10),
                    winnerSide: null, phase: 'ROUND',
                    winReason: null
                },
                stats: { 
                    roundWins: { red: 0, blue: 0 }, 
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
            setBluePreviousMatch('');
            setRedPreviousMatch('');

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
        
        if (!session || !session.courtId) {
            alert('No court is configured for this device. Please go to Court Setup first.');
            return;
        }
    
        try {
            const courtMatchIdRef = ref(database, `events/${eventName}/courts/${session.courtId}/currentMatchId`);
            await set(courtMatchIdRef, selectedMatchId);
    
            localStorage.setItem('selectedMatchId', selectedMatchId);
            
            alert(`Match ${selectedMatchId} successfully loaded to ${session.courtId}.`);
    
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

                        {/* --- Event Selection & Management Bar --- */}
                        <div className="form-group" style={{ 
                            backgroundColor: 'rgba(255,255,255,0.06)', 
                            padding: '10px', 
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            marginBottom: '15px'
                        }}>
                            <label htmlFor="eventName-select" style={{ color: '#4cd964', fontWeight: 'bold' }}>
                                Target Event (目標賽事)
                            </label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <select 
                                    id="eventName-select"
                                    value={eventName}
                                    onChange={(e) => setEventName(e.target.value)}
                                    style={{ flex: 1 }}
                                >
                                    <option value="" disabled>-- 請選擇賽事 --</option>
                                    {eventsList.map(evt => (
                                        <option key={evt.id} value={evt.id}>
                                            {evt.displayName !== evt.id ? `${evt.displayName} (${evt.id})` : evt.id}
                                        </option>
                                    ))}
                                </select>
                                <Button 
                                    onClick={() => setShowCreateEventModal(true)}
                                    title="Create New Event"
                                    fontSize="0.9rem"
                                    angle={120}
                                    icon={<FolderPlus size={16} />}
                                    text="建立賽事"
                                />
                                <Button 
                                    onClick={promptDeleteEvent}
                                    disabled={!eventName}
                                    title="Delete Current Event"
                                    fontSize="0.9rem"
                                    angle={350}
                                    icon={<Trash size={16} />}
                                    text="刪除賽事"
                                />
                            </div>
                        </div>

                        {/* Match Configuration Form */}
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
                                        <input type="text" value={bluePreviousMatch} onChange={e => setBluePreviousMatch(e.target.value)} placeholder="Source Match (optional)" />
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
                                        <input type="text" value={redPreviousMatch} onChange={e => setRedPreviousMatch(e.target.value)} placeholder="Source Match (optional)" />
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

            {/* --- Create Event Modal Overlay --- */}
            {showCreateEventModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        backgroundColor: '#222',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        padding: '25px',
                        width: '90%',
                        maxWidth: '450px',
                        color: '#fff',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                    }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#34c759' }}>
                            <FolderPlus size={24} /> 建立新賽事 (Create New Event)
                        </h3>
                        <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="form-group">
                                <label style={{ color: '#ccc' }}>Event ID (賽事識別碼)</label>
                                <input 
                                    type="text" 
                                    placeholder="例如: TKD2026 (不可重複)" 
                                    value={newEventId}
                                    onChange={e => setNewEventId(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#ccc' }}>Event Name (賽事全稱)</label>
                                <input 
                                    type="text" 
                                    placeholder="例如: 2026 全港跆拳道錦標賽" 
                                    value={newEventName}
                                    onChange={e => setNewEventName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#ccc' }}>Setup Password (設定密碼)</label>
                                <input 
                                    type="text" 
                                    placeholder="例如: BCB2026" 
                                    value={newSetupPassword}
                                    onChange={e => setNewSetupPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <Button 
                                    onClick={() => setShowCreateEventModal(false)}
                                    text="取消"
                                    fontSize="0.9rem"
                                    angle={0}
                                />
                                <Button 
                                    type="submit"
                                    text="確認建立"
                                    fontSize="0.9rem"
                                    angle={120}
                                />
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- Custom Delete Confirmation Modal Overlay --- */}
            {showDeleteModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    zIndex: 1100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        backgroundColor: '#221515',
                        border: '1px solid rgba(255, 59, 48, 0.5)',
                        borderRadius: '12px',
                        padding: '25px',
                        width: '90%',
                        maxWidth: '440px',
                        color: '#fff',
                        boxShadow: '0 10px 40px rgba(255, 59, 48, 0.3)',
                        textAlign: 'left'
                    }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#ff3b30', fontSize: '1.4rem' }}>
                            <ExclamationTriangle size={28} /> 刪除賽事確認 (Confirm Delete)
                        </h3>
                        <p style={{ fontSize: '1rem', lineHeight: '1.5', color: '#ddd' }}>
                            您確定要刪除整個賽事「<strong style={{ color: '#ffcc00' }}>{eventName}</strong>」嗎？
                        </p>
                        <p style={{ fontSize: '0.85rem', color: '#ff6b6b', backgroundColor: 'rgba(255, 59, 48, 0.1)', padding: '10px', borderRadius: '6px' }}>
                            ⚠️ 此操作會將該賽事下的所有比賽數據、場地設定及賽程永久刪除，無法復原！
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                            <Button 
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                                text="取消"
                                fontSize="0.9rem"
                                angle={0}
                            />
                            <Button 
                                onClick={confirmDeleteEvent}
                                disabled={isDeleting}
                                text={isDeleting ? '刪除中...' : '確認刪除'}
                                icon={<Trash size={16} />}
                                fontSize="0.9rem"
                                angle={350}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataImport;
