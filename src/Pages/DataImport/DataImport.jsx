import React, { useState, useEffect, useRef } from 'react';
import { ref, set, get, remove } from "firebase/database";
import { database } from '../../firebase';
import './DataImport.css';
import Squares from '../../Components/Squares/Squares';
import Button from '../../Components/Button/Button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { PlusCircle, Trash, FolderPlus, ExclamationTriangle, FileEarmarkArrowUp, FileEarmarkPdf, CheckCircleFill, Calendar3, Funnel } from 'react-bootstrap-icons';
import { parseHktkdaPdfFile } from '../../Utils/pdfParser';

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

    // Date Filter State for Matches List
    const [selectedDateFilter, setSelectedDateFilter] = useState('all');

    // Create Event Modal State
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [newEventId, setNewEventId] = useState('');
    const [newEventName, setNewEventName] = useState('');
    const [newSetupPassword, setNewSetupPassword] = useState('BCB2026');

    // Delete Event Confirmation Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // PDF Parse & Batch Import State
    const fileInputRef = useRef(null);
    const [isParsingPdf, setIsParsingPdf] = useState(false);
    const [pdfParseResult, setPdfParseResult] = useState(null);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [isBatchUploading, setIsBatchUploading] = useState(false);
    const [importMode, setImportMode] = useState('single'); // 'single' = ALL in target event, 'splitByDate' = split into sub-events by date

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
                setShowPdfModal(true);
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

    // Confirm Batch Write Matches to Firebase (supports single event or split sub-events by date)
    const handleConfirmBatchImport = async () => {
        if (!eventName) {
            alert('請先在目標賽事下拉選單中選擇要匯入的賽事！');
            return;
        }

        if (!pdfParseResult || !pdfParseResult.matches) return;

        setIsBatchUploading(true);
        try {
            if (importMode === 'splitByDate' && pdfParseResult.datesList?.length > 1) {
                const dateGroups = pdfParseResult.dateGroups;
                let createdCount = 0;

                for (let i = 0; i < pdfParseResult.datesList.length; i++) {
                    const dateStr = pdfParseResult.datesList[i];
                    const cleanDate = dateStr.replace(/[^0-9]/g, '');
                    const subEventId = `${eventName}_Day${i + 1}_${cleanDate}`;
                    const subEventName = `${pdfParseResult.eventName} (${dateStr})`;

                    const eventRef = ref(database, `events/${subEventId}`);
                    await set(eventRef, {
                        EventName: subEventName,
                        createdBy: user?.uid || 'system',
                        createdByEmail: user?.email || '',
                        createdAt: Date.now(),
                        matchDate: dateStr,
                        settings: { setupPassword: 'BCB2026' },
                        courts: { court1: { name: 'court1', currentMatchId: '' } },
                        matches: dateGroups[dateStr].matches
                    });
                    createdCount++;
                }

                alert(`🎉 成功按 ${pdfParseResult.datesList.length} 個比賽日期拆分並建立 ${createdCount} 個 Sub-Events 子賽事！`);

            } else {
                const matchesToUpload = pdfParseResult.matches;
                const matchIds = Object.keys(matchesToUpload);

                const uploadPromises = matchIds.map(mId => {
                    const matchRef = ref(database, `events/${eventName}/matches/${mId}`);
                    return set(matchRef, matchesToUpload[mId]);
                });

                await Promise.all(uploadPromises);
                alert(`🎉 成功批量匯入 ${matchIds.length} 場比賽至賽事「${eventName}」！`);
            }

            setShowPdfModal(false);
            setPdfParseResult(null);
            fetchEventsList();

            const matchesRef = ref(database, `events/${eventName}/matches`);
            const snapshot = await get(matchesRef);
            if (snapshot.exists()) {
                setCurrentMatches(snapshot.val());
            }

        } catch (error) {
            console.error("Batch Import Failed:", error);
            alert(`批量寫入 Firebase 失敗: ${error.message}`);
        } finally {
            setIsBatchUploading(false);
        }
    };

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
                            <label htmlFor="eventName-select" style={{ color: '#FFFF00', fontWeight: 'bold' }}>
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

                        {/* --- PDF Match Bracket Batch Upload Zone --- */}
                        <div className="pdf-upload-box">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FileEarmarkPdf size={32} color="#FFFF00" />
                                <div>
                                    <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '0.95rem' }}>
                                        📄 上傳 HKTKDA 賽程 PDF 表格 (PDF Match Bracket Auto-Import)
                                    </div>
                                    <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>
                                        自動解析 PDF 中的比賽對陣樹、藍紅雙方選手、會館名稱及多天日期 (Sub-Events)。
                                    </div>
                                </div>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                accept="application/pdf"
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                            />
                            <Button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isParsingPdf}
                                text={isParsingPdf ? '解析中...' : '選擇 PDF 檔案'}
                                icon={<FileEarmarkArrowUp size={16} />}
                                fontSize="0.9rem"
                                angle={60}
                            />
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '6px' }}>
                                <h3 style={{ margin: 0, border: 'none', padding: 0 }}>Matches in {eventName || 'Event'}</h3>
                                {availableDates.length > 1 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Funnel size={12} color="#FFFF00" />
                                        <select 
                                            value={selectedDateFilter} 
                                            onChange={e => setSelectedDateFilter(e.target.value)}
                                            style={{ 
                                                padding: '2px 6px', 
                                                borderRadius: '4px', 
                                                border: '1px solid rgba(255,255,0,0.5)', 
                                                backgroundColor: '#111', 
                                                color: '#FFFF00', 
                                                fontSize: '0.8rem' 
                                            }}
                                        >
                                            <option value="all">📅 所有日期</option>
                                            {availableDates.map(dStr => (
                                                <option key={dStr} value={dStr}>📅 {dStr}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <ul>
                                {filteredMatchIds.map(mId => {
                                    const blue = currentMatches[mId].config.competitors.blue;
                                    const red = currentMatches[mId].config.competitors.red;
                                    const matchDate = currentMatches[mId].config.matchDate;

                                    const getDisplayText = (competitor) => {
                                        if (competitor.affiliatedClub) {
                                            return `${competitor.name} (${competitor.affiliatedClub})`;
                                        }
                                        return competitor.name;
                                    };

                                    return (
                                        <li key={mId} onClick={() => setSelectedMatchId(mId)} className={selectedMatchId === mId ? 'selected' : ''}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span><strong>{mId}:</strong> {`${getDisplayText(blue)} vs ${getDisplayText(red)}`}</span>
                                                {matchDate && <small style={{ color: '#aaa', fontSize: '0.75rem', marginLeft: '6px' }}>{matchDate}</small>}
                                            </div>
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
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFF00' }}>
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
                                    angle={60}
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
                            您確定要刪除整個賽事「<strong style={{ color: '#FFFF00' }}>{eventName}</strong>」嗎？
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

            {/* --- PDF Batch Import Preview Modal --- */}
            {showPdfModal && pdfParseResult && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    zIndex: 1200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        backgroundColor: '#1a1a24',
                        border: '1px solid rgba(255, 255, 0, 0.5)',
                        borderRadius: '12px',
                        padding: '25px',
                        width: '92%',
                        maxWidth: '920px',
                        maxHeight: '88vh',
                        display: 'flex',
                        flexDirection: 'column',
                        color: '#fff',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7)'
                    }}>
                        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '12px', marginBottom: '12px' }}>
                            <h3 style={{ margin: 0, color: '#FFFF00', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <CheckCircleFill size={26} /> HKTKDA PDF 賽程解析成功 (Parsed Matches Preview)
                            </h3>
                            <div style={{ margin: '6px 0 0 0', color: '#ccc', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <span>識別賽事：<strong style={{ color: '#FFFF00' }}>{pdfParseResult.eventName}</strong></span>
                                <span>共解析：<strong style={{ color: '#FFFF00' }}>{pdfParseResult.matchCount}</strong> 場比賽</span>
                            </div>

                            {/* Multi-Date Notification Badges */}
                            {pdfParseResult.datesList?.length > 1 && (
                                <div style={{ 
                                    marginTop: '10px', 
                                    backgroundColor: 'rgba(255, 255, 0, 0.12)', 
                                    border: '1px solid rgba(255, 255, 0, 0.4)',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                }}>
                                    <div style={{ color: '#FFFF00', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar3 size={16} /> 檢測到跨日賽事 (多於 1 個比賽日期)：
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {pdfParseResult.datesList.map((dStr, idx) => (
                                            <span key={dStr} style={{ 
                                                backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                                                padding: '3px 8px', 
                                                borderRadius: '4px', 
                                                fontSize: '0.8rem',
                                                color: '#fff'
                                            }}>
                                                📅 Day {idx + 1}: <strong>{dStr}</strong> ({Object.keys(pdfParseResult.dateGroups[dStr].matches).length} 場)
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sub Event / Date Split Import Mode Selector */}
                        {pdfParseResult.datesList?.length > 1 && (
                            <div style={{ 
                                backgroundColor: 'rgba(0, 0, 0, 0.3)', 
                                padding: '10px 14px', 
                                borderRadius: '6px', 
                                marginBottom: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <span style={{ fontSize: '0.88rem', color: '#ddd', fontWeight: 'bold' }}>匯入模式 (Import Mode):</span>
                                <div style={{ display: 'flex', gap: '20px' }}>
                                    <label style={{ fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: importMode === 'single' ? '#FFFF00' : '#ccc' }}>
                                        <input 
                                            type="radio" 
                                            name="importMode" 
                                            value="single" 
                                            checked={importMode === 'single'} 
                                            onChange={() => setImportMode('single')}
                                        />
                                        統一寫入當前賽事 ({eventName})
                                    </label>
                                    <label style={{ fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: importMode === 'splitByDate' ? '#FFFF00' : '#ccc' }}>
                                        <input 
                                            type="radio" 
                                            name="importMode" 
                                            value="splitByDate" 
                                            checked={importMode === 'splitByDate'} 
                                            onChange={() => setImportMode('splitByDate')}
                                        />
                                        ⚡ 按日期建立 {pdfParseResult.datesList.length} 個 Sub-Events (子賽事)
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Preview Table */}
                        <div className="pdf-preview-table-wrapper">
                            <table className="pdf-preview-table">
                                <thead>
                                    <tr>
                                        <th>Match ID</th>
                                        <th>日期 (Date)</th>
                                        <th>藍方 (Blue Competitor)</th>
                                        <th>紅方 (Red Competitor)</th>
                                        <th>下輪 Match ID</th>
                                        <th>下輪位置</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(pdfParseResult.matches).map(mId => {
                                        const m = pdfParseResult.matches[mId];
                                        const blue = m.config.competitors.blue;
                                        const red = m.config.competitors.red;
                                        return (
                                            <tr key={mId}>
                                                <td style={{ fontWeight: 'bold', color: '#FFFF00' }}>{mId}</td>
                                                <td style={{ color: '#aaa', fontSize: '0.8rem' }}>{m.config.matchDate || '--'}</td>
                                                <td>
                                                    {blue.name ? (
                                                        <span><strong style={{ color: '#4285F4' }}>[藍]</strong> {blue.name} <small style={{ color: '#aaa' }}>({blue.affiliatedClub || '無會館'})</small></span>
                                                    ) : (
                                                        <span style={{ color: '#777', fontStyle: 'italic' }}>-- (TBD / 由前場勝出)</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {red.name ? (
                                                        <span><strong style={{ color: '#ff3b30' }}>[紅]</strong> {red.name} <small style={{ color: '#aaa' }}>({red.affiliatedClub || '無會館'})</small></span>
                                                    ) : (
                                                        <span style={{ color: '#777', fontStyle: 'italic' }}>-- (TBD / 由前場勝出)</span>
                                                    )}
                                                </td>
                                                <td style={{ color: '#FFFF00' }}>{m.config.nextMatchId || '決賽 (Final)'}</td>
                                                <td style={{ textTransform: 'uppercase', color: m.config.nextMatchSlot === 'blue' ? '#4285F4' : m.config.nextMatchSlot === 'red' ? '#ff3b30' : '#aaa' }}>
                                                    {m.config.nextMatchSlot || '--'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Action Bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                                目標賽事: <strong>{eventName || '請先選擇賽事'}</strong>
                            </span>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <Button 
                                    onClick={() => setShowPdfModal(false)}
                                    disabled={isBatchUploading}
                                    text="取消"
                                    fontSize="0.95rem"
                                    angle={0}
                                />
                                <Button 
                                    onClick={handleConfirmBatchImport}
                                    disabled={isBatchUploading || !eventName}
                                    text={isBatchUploading ? '寫入中...' : importMode === 'splitByDate' ? `🚀 自動建立 ${pdfParseResult.datesList?.length} 個 Sub-Events` : '🚀 批量寫入 Firebase (Batch Import)'}
                                    fontSize="0.95rem"
                                    angle={60}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataImport;
