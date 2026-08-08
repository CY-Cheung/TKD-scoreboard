import React, { useState, useEffect, useRef } from 'react';
import { ref, set, get, remove } from "firebase/database";
import { database } from '../../firebase';
import './DataImport.css';
import Button from '../../Components/Button/Button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { PlusCircle, Trash, FolderPlus, ExclamationTriangle, FileEarmarkArrowUp, FileEarmarkPdf, CheckCircleFill, Calendar3, Funnel, House, XCircle, CheckCircle, Display, Diagram3, X, ArrowLeft } from 'react-bootstrap-icons';
import { parseHktkdaPdfFile } from '../../Utils/pdfParser';
import TournamentBracket from '../../Components/TournamentBracket/TournamentBracket';

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
    const [newMaxPointGap, setNewMaxPointGap] = useState(15);
    const [newMaxGamjeom, setNewMaxGamjeom] = useState(5);
    const [newRoundDuration, setNewRoundDuration] = useState(90);
    const [newRestDuration, setNewRestDuration] = useState(60);
    const [currentMatches, setCurrentMatches] = useState({});
    const [selectedMatchId, setSelectedMatchId] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);
    const toastTimeoutRef = useRef(null);

    const showToast = (message) => {
        setToastMessage(message);
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = setTimeout(() => {
            setToastMessage(null);
        }, 3000);
    };

    // Date Filter State for Matches List
    const [selectedDateFilter, setSelectedDateFilter] = useState('all');

    // Create Event Modal State
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [showBracketModal, setShowBracketModal] = useState(false);
    const [bracketZoom, setBracketZoom] = useState(1);
    const [newEventId, setNewEventId] = useState('');
    const [newEventName, setNewEventName] = useState('');
    const [newSetupPassword, setNewSetupPassword] = useState('');

    // Delete Event Confirmation Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // PDF Parse & Batch Import State
    const fileInputRef = useRef(null);
    const [isParsingPdf, setIsParsingPdf] = useState(false);
    const [pdfParseResult, setPdfParseResult] = useState(null);
    
    // Form state - Default Point Gap set to 15 as per new rules
    const [matchId, setMatchId] = useState('');
    const [nextMatchId, setNextMatchId] = useState('');
    const [nextMatchSlot, setNextMatchSlot] = useState('');
    const [maxPointGap, setMaxPointGap] = useState(15);
    const [maxGamjeom, setMaxGamjeom] = useState(5);
    const [roundDuration, setRoundDuration] = useState(90);
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
        setSelectedDateFilter('all');
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

    // Extract available unique dates from currentMatches
    const availableDates = Array.from(new Set(
        Object.values(currentMatches)
            .map(m => m.config?.matchDate)
            .filter(Boolean)
    ));

    // Filter match IDs by selected date
    const filteredMatchIds = Object.keys(currentMatches).filter(mId => {
        if (selectedDateFilter === 'all') return true;
        return currentMatches[mId]?.config?.matchDate === selectedDateFilter;
    });

    // PDF File Upload Handler
    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
            alert('請選擇有效的 PDF 賽程文件！');
            return;
        }

        setIsParsingPdf(true);
        try {
            const result = await parseHktkdaPdfFile(file);
            if (!result || result.matchCount === 0) {
                alert('未能在 PDF 中解析出有效賽程，請確認格式是否為香港跆拳道協會對陣表。');
            } else {
                setPdfParseResult(result);
                setNewEventName(result.eventName);
                if (!newEventId) {
                    setNewEventId('TKD' + Date.now().toString().slice(-6));
                }
            }
        } catch (error) {
            console.error("PDF Parsing Failed:", error);
            alert(`解析 PDF 失敗: ${error.message}`);
        } finally {
            setIsParsingPdf(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Create New Event Handler (Handles PDF auto-import and date splitting)
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
            const finalRules = {
                maxPointGap: parseInt(newMaxPointGap, 10) || 15,
                maxGamjeom: parseInt(newMaxGamjeom, 10) || 5,
                roundDuration: parseInt(newRoundDuration, 10) || 90,
                restDuration: parseInt(newRestDuration, 10) || 60
            };

            if (pdfParseResult) {
                if (pdfParseResult.dateGroups) {
                    Object.values(pdfParseResult.dateGroups).forEach(group => {
                        if (group.matches) {
                            Object.values(group.matches).forEach(m => {
                                if (m.config) m.config.rules = { ...m.config.rules, ...finalRules };
                            });
                        }
                    });
                } else if (pdfParseResult.matches) {
                    Object.values(pdfParseResult.matches).forEach(m => {
                        if (m.config) m.config.rules = { ...m.config.rules, ...finalRules };
                    });
                }

                if (pdfParseResult.datesList?.length > 1) {
                    let createdCount = 0;
                    let firstCleanDate = '';
                    
                    for (let i = 0; i < pdfParseResult.datesList.length; i++) {
                        const dateStr = pdfParseResult.datesList[i];
                        const parts = dateStr.split('/');
                        let formattedDate = dateStr;
                        let cleanDate = dateStr.replace(/[^0-9]/g, '');
                        if (parts.length === 3) {
                            const [d, m, y] = parts;
                            formattedDate = `${y}/${m.padStart(2, '0')}/${d.padStart(2, '0')}`;
                            cleanDate = `${y}${m.padStart(2, '0')}${d.padStart(2, '0')}`;
                        }
                        if (i === 0) firstCleanDate = cleanDate;

                        const subEventId = `${trimmedId}_Day${i + 1}_${cleanDate}`;
                        const subEventName = `${trimmedName} (Day ${i + 1}) (${formattedDate})`;

                        const eventRef = ref(database, `events/${subEventId}`);
                        await set(eventRef, {
                            EventName: subEventName,
                            createdBy: user.uid,
                            createdByEmail: user.email || '',
                            createdAt: Date.now(),
                            matchDate: formattedDate,
                            settings: { 
                                setupPassword: newSetupPassword,
                                maxPointGap: parseInt(newMaxPointGap, 10) || 15,
                                maxGamjeom: parseInt(newMaxGamjeom, 10) || 5,
                                roundDuration: parseInt(newRoundDuration, 10) || 90,
                                restDuration: parseInt(newRestDuration, 10) || 60
                            },
                            courts: { court1: { name: 'court1', currentMatchId: '' } },
                            matches: pdfParseResult.dateGroups[dateStr].matches
                        });
                        createdCount++;
                    }

                    alert(`✅ 成功按 ${pdfParseResult.datesList.length} 個比賽日期拆分並建立 ${createdCount} 個子賽事！`);
                    setEventName(`${trimmedId}_Day1_${firstCleanDate}`);
                } else {
                    const dateStr = pdfParseResult.datesList?.[0] || '';
                    let formattedDate = dateStr;
                    if (dateStr) {
                        const parts = dateStr.split('/');
                        if (parts.length === 3) {
                            const [d, m, y] = parts;
                            formattedDate = `${y}/${m.padStart(2, '0')}/${d.padStart(2, '0')}`;
                        }
                    }

                    const eventRef = ref(database, `events/${trimmedId}`);
                    await set(eventRef, {
                        EventName: trimmedName,
                        createdBy: user.uid,
                        createdByEmail: user.email || '',
                        createdAt: Date.now(),
                        matchDate: formattedDate,
                        settings: { 
                            setupPassword: newSetupPassword,
                            maxPointGap: parseInt(newMaxPointGap, 10) || 15,
                            maxGamjeom: parseInt(newMaxGamjeom, 10) || 5,
                            roundDuration: parseInt(newRoundDuration, 10) || 90,
                            restDuration: parseInt(newRestDuration, 10) || 60
                        },
                        courts: { court1: { name: 'court1', currentMatchId: '' } },
                        matches: pdfParseResult.matches
                    });
                    alert(`✅ 成功建立賽事並匯入賽程：${trimmedName}`);
                    setEventName(trimmedId);
                }
            } else {
                const eventRef = ref(database, `events/${trimmedId}`);
                await set(eventRef, {
                    EventName: trimmedName,
                    createdBy: user.uid,
                    createdByEmail: user.email || '',
                    createdAt: Date.now(),
                    settings: { 
                        setupPassword: newSetupPassword,
                        maxPointGap: parseInt(newMaxPointGap, 10) || 15,
                        maxGamjeom: parseInt(newMaxGamjeom, 10) || 5,
                        roundDuration: parseInt(newRoundDuration, 10) || 90,
                        restDuration: parseInt(newRestDuration, 10) || 60
                    },
                    courts: { court1: { name: 'court1', currentMatchId: '' } },
                    matches: {}
                });
                alert(`✅ 成功建立賽事：${trimmedName}`);
                setEventName(trimmedId);
            }

            setNewEventId('');
            setNewEventName('');
            setNewSetupPassword('');
            setNewMaxPointGap(15);
            setNewMaxGamjeom(5);
            setNewRoundDuration(90);
            setNewRestDuration(60);
            setPdfParseResult(null);
            setShowCreateEventModal(false);
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
            setRoundDuration(rules.roundDuration || 90);
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
            showToast('Please select an event and a match to load.');
            return;
        }
        
        if (!session || !session.courtId) {
            showToast('No court is configured for this device. Please go to Court Setup first.');
            return;
        }
    
        try {
            const courtMatchIdRef = ref(database, `events/${eventName}/courts/${session.courtId}/currentMatchId`);
            await set(courtMatchIdRef, selectedMatchId);
    
            localStorage.setItem('selectedMatchId', selectedMatchId);
            
            showToast(`Match ${selectedMatchId} successfully loaded to ${session.courtId}.`);
    
        } catch (error) {
            console.error("Error loading match to court:", error);
            showToast(`Failed to load match to court. See console for details.`);
        }
    };


    const toggleFullScreen = (e) => {
        if (e.target === e.currentTarget) {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => console.log(err));
            } else {
                document.exitFullscreen();
            }
        }
    };
    return (
        <div className="di-container aurora-bg" onDoubleClick={toggleFullScreen}>
            {toastMessage && (
                <div style={{
                    position: 'absolute',
                    top: '2cqi',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    color: '#fff',
                    padding: '0.8cqi 1.6cqi',
                    borderRadius: '0.5cqi',
                    fontSize: '1cqi',
                    zIndex: 2000,
                    boxShadow: '0 0.4cqi 1cqi rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)'
                }}>
                    {toastMessage}
                </div>
            )}
            <div className="di-content-wrapper glass-card">

                
                {showBracketModal ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                        <div style={{ padding: '0.52cqi 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.78cqi' }}>
                                <Button 
                                    onClick={() => { setShowBracketModal(false); setBracketZoom(1); }}
                                    text="Back (返回)"
                                    icon={<ArrowLeft size="0.83cqi" />}
                                    fontSize="0.77cqi"
                                    angle={180}
                                />
                                <h2 style={{ margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.52cqi', fontSize: '1.19cqi' }}>
                                    <Diagram3 size="1.66cqi" color="#FFFF00" /> {eventsList.find(e => e.id === eventName)?.displayName || eventName || 'Event'}
                                </h2>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.52cqi' }}>
                                <Button onClick={() => setBracketZoom(z => Math.max(0.1, z - 0.1))} text="-" angle={0} style={{ padding: '2px 0.52cqi', minWidth: '2.08cqi' }} fontSize="0.8cqi" />
                                <span style={{ color: '#fff', minWidth: '2.6cqi', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8cqi' }}>{Math.round(bracketZoom * 100)}%</span>
                                <Button onClick={() => setBracketZoom(z => Math.min(3, z + 0.1))} text="+" angle={180} style={{ padding: '2px 0.52cqi', minWidth: '2.08cqi' }} fontSize="0.8cqi" />
                                <Button onClick={() => setBracketZoom(1)} text="Reset (重置)" angle={90} style={{ padding: '0.21cqi 0.78cqi', marginLeft: '0.52cqi' }} fontSize="0.77cqi" />
                            </div>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '1.04cqi 0' }}>
                            {Object.keys(currentMatches).length > 0 ? (
                                <div style={{ zoom: bracketZoom }}>
                                    <TournamentBracket matches={currentMatches} />
                                </div>
                            ) : (
                                <div style={{ color: '#ccc', textAlign: 'center', marginTop: '2.6cqi' }}>No matches available to display bracket.</div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="di-form-and-list-container">

                    <div className="di-form-section">
                        <h2 style={{ fontSize: '1.5cqi', margin: '0 0 0.5cqi 0', color: '#ffffff', fontWeight: '800', lineHeight: '1.1', letterSpacing: '0.026cqi' }}>Import Event Data</h2>

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
                                        <label>Round Time (s)</label>
                                        <input type="number" value={roundDuration} onChange={e => setRoundDuration(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Rest Time (s)</label>
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
                            <Button text="Add Match (新增賽事)" angle={260} onClick={handleAddMatch} icon={<PlusCircle size="0.83cqi" />} style={{ flex: 1, whiteSpace: "nowrap", padding: "0.42cqi 0.21cqi", fontSize: "0.72cqi" }} />
                            <Button text="Load (載入)" angle={40} onClick={selectedMatchId ? handleLoadMatch : null} disabled={!selectedMatchId} icon={<Display size="0.83cqi" />} style={{ flex: 1, whiteSpace: "nowrap", padding: "0.42cqi 0.21cqi", fontSize: "0.72cqi" }} />
                            <Button text="Home (主頁)" angle={150} onClick={() => navigate('/')} icon={<House size="0.83cqi" />} style={{ flex: 1, whiteSpace: "nowrap", padding: "0.42cqi 0.21cqi", fontSize: "0.72cqi" }} />
                        </div>
                    </div>

                    <div className="di-matches-section">
                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginBottom: '0.42cqi', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '0.31cqi' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {(() => {
                                    const rawName = eventsList.find(e => e.id === eventName)?.displayName || eventName || 'Event';
                                    const dayMatch = rawName.match(/^(.*?)\s*(\(Day\s+\d+\))\s*(\(.*\))$/);
                                    return <h3 style={{ margin: 0, border: 'none', padding: 0, color: '#fff', fontSize: '1.19cqi' }}>{dayMatch ? dayMatch[1] : rawName}</h3>;
                                })()}
                                {availableDates.length > 1 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.21cqi' }}>
                                        <Funnel size="0.62cqi" color="#FFFF00" />
                                        <select 
                                            value={selectedDateFilter} 
                                            onChange={e => setSelectedDateFilter(e.target.value)}
                                            style={{ 
                                                padding: '2px 0.31cqi', 
                                                borderRadius: '0.21cqi', 
                                                border: '1px solid rgba(255,255,0,0.5)', 
                                                backgroundColor: '#111', 
                                                color: '#FFFF00', 
                                                fontSize: '0.68cqi' 
                                            }}
                                        >
                                            <option value="all">📅 All Dates</option>
                                            {availableDates.map(dStr => (
                                                <option key={dStr} value={dStr}>📅 {dStr}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.21cqi' }}>
                                {(() => {
                                    const rawName = eventsList.find(e => e.id === eventName)?.displayName || eventName || 'Event';
                                    const dayMatch = rawName.match(/^(.*?)\s*(\(Day\s+\d+\))\s*(\(.*\))$/);
                                    if (dayMatch) {
                                        return <span style={{ fontSize: '1cqi', color: '#ccc' }}>{dayMatch[2].replace(/[()]/g, '')} - {dayMatch[3].replace(/[()]/g, '')}</span>;
                                    }
                                    return <span />;
                                })()}
                                <Button 
                                    text="Bracket (賽程表)" 
                                    icon={<Diagram3 size="0.83cqi" />} 
                                    onClick={() => setShowBracketModal(true)}
                                    fontSize="0.81cqi"
                                    style={{ padding: '0.31cqi 0.62cqi' }}
                                />
                            </div>
                        </div>
                        <div className="matches-list">
                            <ul>
                                {filteredMatchIds.map(mId => {
                                    const blue = currentMatches[mId].config.competitors.blue;
                                    const red = currentMatches[mId].config.competitors.red;
                                    const matchDate = currentMatches[mId].config.matchDate;

                                    const getDisplayText = (competitor) => {
                                        if (!competitor.name && !competitor.affiliatedClub && competitor.previousMatch) {
                                            return `${competitor.previousMatch} Winner`;
                                        }
                                        if (competitor.affiliatedClub) {
                                            return `${competitor.name} (${competitor.affiliatedClub})`;
                                        }
                                        return competitor.name || '';
                                    };

                                    return (
                                        <li key={mId} onClick={() => setSelectedMatchId(mId)} className={selectedMatchId === mId ? 'selected' : ''}>
                                            <div style={{ fontSize: '1cqi', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <strong style={{ color: '#fff', marginRight: '0.21cqi' }}>{mId}:</strong> 
                                                <span style={{ color: '#3399ff' }}>{getDisplayText(blue)}</span> 
                                                <span style={{ color: '#fff', margin: '0 0.5cqi', fontSize: '1cqi' }}>VS</span> 
                                                <span style={{ color: '#ff3b30' }}>{getDisplayText(red)}</span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                </div>
                )}
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
                        borderRadius: '0.62cqi',
                        padding: '1.3cqi',
                        width: '90%',
                        maxWidth: '23.4cqi',
                        color: '#fff',
                        boxShadow: '0 0.42cqi 1.66cqi rgba(0,0,0,0.5)'
                    }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.42cqi', color: '#FFFF00' }}>
                            <FolderPlus size="1.25cqi" /> Create New Event
                        </h3>
                        <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '0.78cqi' }}>
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.78cqi', borderRadius: '0.42cqi', display: 'flex', flexDirection: 'column', gap: '0.52cqi', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.52cqi' }}>
                                    <FileEarmarkPdf size="1.25cqi" color="#FFFF00" />
                                    <span style={{ color: '#fff', fontWeight: 'bold' }}>上傳 PDF 自動建立 (Optional)</span>
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68cqi' }}>上傳對陣表即可自動填充賽事名稱及匯入所有選手資料。如比賽橫跨多日，系統將自動分拆為多個子賽事。</div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    accept="application/pdf"
                                    style={{ display: 'none' }}
                                    onChange={handleFileSelect}
                                />
                                <Button 
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isParsingPdf}
                                    text={isParsingPdf ? 'Parsing...' : 'Select PDF'}
                                    icon={<FileEarmarkArrowUp size="0.83cqi" />}
                                    fontSize="0.77cqi"
                                    angle={60}
                                />
                                {pdfParseResult && (
                                    <div style={{ color: '#4CAF50', fontSize: '0.72cqi', marginTop: '0.26cqi' }}>
                                        ✅ 成功解析：{pdfParseResult.matchCount} 場比賽
                                        {pdfParseResult.datesList?.length > 1 && ` (包含 ${pdfParseResult.datesList.length} 個日期，將自動分拆為多個賽事)`}
                                    </div>
                                )}
                            </div>
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.52cqi' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ color: '#ccc', fontSize: '0.72cqi' }}>Point Gap (分差)</label>
                                    <input type="number" value={newMaxPointGap} onChange={e => setNewMaxPointGap(e.target.value)} style={{ width: '100%', padding: '0.42cqi', borderRadius: '0.21cqi', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ color: '#ccc', fontSize: '0.72cqi' }}>Max Gam-jeom (犯規上限)</label>
                                    <input type="number" value={newMaxGamjeom} onChange={e => setNewMaxGamjeom(e.target.value)} style={{ width: '100%', padding: '0.42cqi', borderRadius: '0.21cqi', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ color: '#ccc', fontSize: '0.72cqi' }}>Round Time (回合秒數)</label>
                                    <input type="number" value={newRoundDuration} onChange={e => setNewRoundDuration(e.target.value)} style={{ width: '100%', padding: '0.42cqi', borderRadius: '0.21cqi', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ color: '#ccc', fontSize: '0.72cqi' }}>Rest Time (休息秒數)</label>
                                    <input type="number" value={newRestDuration} onChange={e => setNewRestDuration(e.target.value)} style={{ width: '100%', padding: '0.42cqi', borderRadius: '0.21cqi', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.52cqi', marginTop: '0.52cqi' }}>
                                <Button 
                                    onClick={() => setShowCreateEventModal(false)}
                                    text="Cancel (取消)"
                                    fontSize="0.77cqi"
                                    angle={0}
                                    icon={<XCircle size="0.83cqi" />}
                                />
                                <Button 
                                    type="submit"
                                    text="Confirm (確認)"
                                    fontSize="0.77cqi"
                                    angle={60}
                                    icon={<CheckCircle size="0.83cqi" />}
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
                        borderRadius: '0.62cqi',
                        padding: '1.3cqi',
                        width: '90%',
                        maxWidth: '22.88cqi',
                        color: '#fff',
                        boxShadow: '0 0.52cqi 2.08cqi rgba(255, 59, 48, 0.3)',
                        textAlign: 'left'
                    }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.52cqi', color: '#ff3b30', fontSize: '1.19cqi' }}>
                            <ExclamationTriangle size="1.46cqi" /> 刪除賽事確認 (Confirm Delete)
                        </h3>
                        <p style={{ fontSize: '0.85cqi', lineHeight: '1.5', color: '#ddd' }}>
                            您確定要刪除整個賽事「<strong style={{ color: '#FFFF00' }}>{eventName}</strong>」嗎？
                        </p>
                        <p style={{ fontSize: '0.72cqi', color: '#ff6b6b', backgroundColor: 'rgba(255, 59, 48, 0.1)', padding: '0.52cqi', borderRadius: '0.31cqi' }}>
                            ⚠️ 此操作會將該賽事下的所有比賽數據、場地設定及賽程永久刪除，無法復原！
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.62cqi', marginTop: '1.04cqi' }}>
                            <Button 
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                                text="Cancel (取消)"
                                fontSize="0.77cqi"
                                angle={0}
                                icon={<XCircle size="0.83cqi" />}
                            />
                            <Button 
                                onClick={confirmDeleteEvent}
                                disabled={isDeleting}
                                text={isDeleting ? 'Deleting...' : 'Confirm Delete'}
                                icon={<Trash size="0.83cqi" />}
                                fontSize="0.77cqi"
                                angle={350}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DataImport;
