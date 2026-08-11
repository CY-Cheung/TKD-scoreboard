import React, { useState, useEffect, useRef } from 'react';
import { ref, set, remove } from "firebase/database";
import { database } from '../../firebase';
import { usePopup } from '../../Context/PopupContext';
import './DataImport.css';
import Button from '../../Components/Button/Button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useEventSession } from '../../Context/EventSessionContext';
import { PlusCircle, Trash, FolderPlus, ExclamationTriangle, FileEarmarkArrowUp, FileEarmarkPdf, CheckCircleFill, Calendar3, Funnel, House, XCircle, CheckCircle, Display, Diagram3, X, ArrowLeft } from 'react-bootstrap-icons';
import { parseHktkdaPdfFile } from '../../Utils/pdfParser';
import { appendIvrQuotaToSettings, appendIvrQuotaToRules, formatIvrQuotaForInput } from '../../Api';
import TournamentBracket from '../../Components/TournamentBracket/TournamentBracket';
import { StableLocaleText, useAlternatingLocale } from '../../Components/AlternatingLocale/AlternatingLocale';
import {
    buildCourtsMap,
    buildEventRecords,
    normalizeRulesFromForm,
} from '../../services/eventCreation';
import { createMatchDocument } from '../../services/matchFactory';
import {
    fetchEventList,
    writeEventIndexEntry,
} from '../../services/eventIndexFirebase';
import {
    dualSetCourtField,
    mirrorCourtsMapToFlat,
    eventPayloadForLegacyWrite,
    removeLegacyCourtsForEvent,
} from '../../services/courtFirebase';
import {
    mirrorMatchFlatArtifacts,
    removeMatchFlatArtifacts,
    fetchMatchesForEvent,
} from '../../services/matchFirebase';
import { legacyMatchConfigOnlyPayload } from '../../services/matchPaths';

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
    const { user } = useAuth();
    const { session } = useEventSession(); 
    const [eventsList, setEventsList] = useState([]);
    const [eventName, setEventName] = useState('');
    const [newMaxPointGap, setNewMaxPointGap] = useState(15);
    const [newMaxGamjeom, setNewMaxGamjeom] = useState(5);
    const [newRoundDuration, setNewRoundDuration] = useState(90);
    const [newRestDuration, setNewRestDuration] = useState(60);
    const [newIvrQuota, setNewIvrQuota] = useState('');
    const [currentMatches, setCurrentMatches] = useState({});
    const [selectedMatchId, setSelectedMatchId] = useState(null);
    const { showToast, showConfirm } = usePopup();
    const { locale, visible: localeVisible } = useAlternatingLocale();

    // Date Filter State for Matches List
    const [selectedDateFilter, setSelectedDateFilter] = useState('all');

    // Create Event Modal State
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [showBracketModal, setShowBracketModal] = useState(false);
    const [bracketZoom, setBracketZoom] = useState(1);
    const [newEventId, setNewEventId] = useState('');
    const [newEventName, setNewEventName] = useState('');
    const [newSetupPassword, setNewSetupPassword] = useState('');

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
    const [ivrQuota, setIvrQuota] = useState('');
    const [blueName, setBlueName] = useState('');
    const [blueAffiliatedClub, setBlueAffiliatedClub] = useState('');
    const [bluePreviousMatch, setBluePreviousMatch] = useState('');
    const [redName, setRedName] = useState('');
    const [redAffiliatedClub, setRedAffiliatedClub] = useState('');
    const [redPreviousMatch, setRedPreviousMatch] = useState('');

    // Fetch All Events from Firebase (prefer light eventIndex)
    const fetchEventsList = () => {
        fetchEventList(database).then((list) => {
            setEventsList(list);

            if (list.length === 0) {
                setEventName('');
                return;
            }

            if (!eventName) {
                if (session?.eventId && list.some((e) => e.id === session.eventId)) {
                    setEventName(session.eventId);
                } else {
                    setEventName(list[0].id);
                }
            }
        }).catch((err) => {
            console.error("Error fetching events list:", err);
        });
    };

    useEffect(() => {
        fetchEventsList();
    }, [session?.eventId]);

    // Fetch Matches when eventName changes (prefer flat matches + matchLive)
    useEffect(() => {
        setSelectedMatchId(null);
        setSelectedDateFilter('all');
        if (eventName) {
            fetchMatchesForEvent(database, eventName)
                .then((matches) => setCurrentMatches(matches || {}))
                .catch(() => setCurrentMatches({}));
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
            showToast('請選擇有效的 PDF 賽程文件！');
            return;
        }

        setIsParsingPdf(true);
        try {
            const result = await parseHktkdaPdfFile(file);
            if (!result || result.matchCount === 0) {
                showToast('未能在 PDF 中解析出有效賽程，請確認格式是否為香港跆拳道協會對陣表。');
            } else {
                setPdfParseResult(result);
                setNewEventName(result.eventName);
                if (!newEventId) {
                    setNewEventId('TKD' + Date.now().toString().slice(-6));
                }
            }
        } catch (error) {
            console.error("PDF Parsing Failed:", error);
            showToast(`解析 PDF 失敗: ${error.message}`);
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
            showToast('🔒 請先登入 Google 帳號，方可建立新賽事！');
            return;
        }

        const trimmedId = newEventId.trim();
        const trimmedName = newEventName.trim();

        if (!trimmedId || !trimmedName) {
            showToast('請提供有效的 Event ID 與 Event Name！');
            return;
        }

        try {
            const formRules = normalizeRulesFromForm({
                maxPointGap: newMaxPointGap,
                maxGamjeom: newMaxGamjeom,
                roundDuration: newRoundDuration,
                restDuration: newRestDuration,
            });
            const { courts } = buildCourtsMap(1);
            const settings = appendIvrQuotaToSettings(
                { setupPassword: newSetupPassword, ...formRules },
                newIvrQuota
            );

            const { records, primaryEventId, mode, datesCount } = buildEventRecords({
                eventId: trimmedId,
                eventName: trimmedName,
                user,
                settings,
                courts,
                courtCount: 1,
                pdfParseResult,
            });

            for (const record of records) {
                // Stage 5: events/{id} meta + match config only; live → matchLive.
                await set(
                    ref(database, `events/${record.id}`),
                    eventPayloadForLegacyWrite(record.data, legacyMatchConfigOnlyPayload)
                );
                await writeEventIndexEntry(database, record.id, record.data);
                await mirrorCourtsMapToFlat(database, record.id, record.data.courts);
                await removeLegacyCourtsForEvent(database, record.id).catch(() => {});
                if (record.data.matches) {
                    await Promise.all(
                        Object.entries(record.data.matches).map(([mid, mdata]) =>
                            mirrorMatchFlatArtifacts(database, record.id, mid, mdata)
                        )
                    );
                }
            }

            if (mode === 'multi') {
                showToast(`✅ 成功按 ${datesCount} 個比賽日期拆分並建立 ${records.length} 個子賽事！`);
            } else if (mode === 'single-pdf') {
                showToast(`✅ 成功建立賽事並匯入賽程：${trimmedName}`);
            } else {
                showToast(`✅ 成功建立賽事：${trimmedName}`);
            }
            setEventName(primaryEventId);

            setNewEventId('');
            setNewEventName('');
            setNewSetupPassword('');
            setNewMaxPointGap(15);
            setNewMaxGamjeom(5);
            setNewRoundDuration(90);
            setNewRestDuration(60);
            setNewIvrQuota('');
            setPdfParseResult(null);
            setShowCreateEventModal(false);
            fetchEventsList();

        } catch (error) {
            console.error("Create Event Failed:", error);
            showToast(`建立賽事失敗: ${error.message}`);
        }
    };

    // Prompt Delete Match Confirmation
    const promptDeleteMatch = () => {
        if (!eventName || !selectedMatchId) {
            showToast('請先選擇要刪除的比賽場次 (Match)。');
            return;
        }

        if (!user) {
            showToast('🔒 請先登入 Google 帳號！');
            return;
        }
        
        showConfirm({
            title: '刪除場次確認 (Confirm Delete Match)',
            message: `您確定要刪除場次「${selectedMatchId}」嗎？\n⚠️ 此操作無法復原，該場次的所有資料將被永久刪除！`,
            onConfirm: confirmDeleteMatch,
            confirmText: 'Confirm Delete',
            cancelText: 'Cancel'
        });
    };

    // Confirm Delete Match Execution
    const confirmDeleteMatch = async () => {
        if (!eventName || !selectedMatchId || !user) return;
        setIsDeleting(true);

        try {
            const matchRef = ref(database, `events/${eventName}/matches/${selectedMatchId}`);
            await remove(matchRef);
            await removeMatchFlatArtifacts(database, eventName, selectedMatchId);
            showToast(`🗑️ 場次 ${selectedMatchId} 已成功刪除！`);
            setSelectedMatchId(null);
            
            // Remove from local state
            setCurrentMatches(prev => {
                const newMatches = { ...prev };
                delete newMatches[selectedMatchId];
                return newMatches;
            });
        } catch (error) {
            console.error("Delete Match Failed:", error);
            showToast(`刪除場次失敗：\n(${error.message})`);
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
            setIvrQuota(formatIvrQuotaForInput(rules.ivrQuota));
    
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
            showToast('Please provide an Event Name and a Match ID.');
            return;
        }

        try {
            const newMatch = createMatchDocument({
                matchId,
                nextMatchId: nextMatchId || null,
                nextMatchSlot: nextMatchSlot || null,
                rules: appendIvrQuotaToRules({
                    maxPointGap: parseInt(maxPointGap, 10),
                    maxGamjeom: parseInt(maxGamjeom, 10),
                    roundDuration: parseInt(roundDuration, 10),
                    restDuration: parseInt(restDuration, 10),
                }, ivrQuota),
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
                roundDuration: parseInt(roundDuration, 10),
            });

            const matchRef = ref(database, `events/${eventName}/matches/${matchId}`);
            await set(matchRef, legacyMatchConfigOnlyPayload(newMatch));
            await mirrorMatchFlatArtifacts(database, eventName, matchId, newMatch);
            
            showToast(`Match ${matchId} added to event ${eventName} in Firebase!`);
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
            showToast(`Failed to add match to Firebase. See console for details.`);
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
            await dualSetCourtField(
                database,
                eventName,
                session.courtId,
                "currentMatchId",
                selectedMatchId
            );
    
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
            <div className="di-content-wrapper glass-card">

                
                {showBracketModal ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                        <div style={{ padding: '0.52cqi 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.78cqi' }}>
                                <Button 
                                    onClick={() => { setShowBracketModal(false); setBracketZoom(1); }}
                                    icon={<ArrowLeft size="0.83cqi" />}
                                    fontSize="0.77cqi"
                                    angle={180}
                                >
                                    <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Back" zh="返回" />
                                </Button>
                                <h2 style={{ margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.52cqi', fontSize: '1.19cqi' }}>
                                    <Diagram3 size="1.66cqi" color="#FFFF00" /> {eventsList.find(e => e.id === eventName)?.displayName || eventName || 'Event'}
                                </h2>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.52cqi' }}>
                                <Button onClick={() => setBracketZoom(z => Math.max(0.1, z - 0.1))} text="-" angle={0} style={{ padding: '2px 0.52cqi', minWidth: '2.08cqi' }} fontSize="0.8cqi" />
                                <span style={{ color: '#fff', minWidth: '2.6cqi', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8cqi' }}>{Math.round(bracketZoom * 100)}%</span>
                                <Button onClick={() => setBracketZoom(z => Math.min(3, z + 0.1))} text="+" angle={180} style={{ padding: '2px 0.52cqi', minWidth: '2.08cqi' }} fontSize="0.8cqi" />
                                <Button onClick={() => setBracketZoom(1)} angle={90} style={{ padding: '0.21cqi 0.78cqi', marginLeft: '0.52cqi' }} fontSize="0.77cqi">
                                    <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Reset" zh="重置" />
                                </Button>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '1.04cqi 0' }}>
                            {Object.keys(currentMatches).length > 0 ? (
                                <div style={{ zoom: bracketZoom }}>
                                    <TournamentBracket matches={currentMatches} />
                                </div>
                            ) : (
                                <div style={{ color: '#ccc', textAlign: 'center', marginTop: '2.6cqi' }}>
                                    <StableLocaleText as="span" locale={locale} visible={localeVisible} en="No matches available to display bracket." zh="沒有可顯示的賽程表。" />
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="di-form-and-list-container">

                    <div className="di-form-section">
                        <StableLocaleText
                            as="h2"
                            locale={locale}
                            visible={localeVisible}
                            className="di-page-title"
                            en="Manage Match"
                            zh="管理賽事"
                        />

                        {/* Match Configuration Form */}
                        <div className="match-form">
                            <fieldset>
                                <legend>
                                    <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Match Configuration" zh="比賽設定" />
                                </legend>
                                <div className="di-config-rows">
                                    <div className="fieldset-content">
                                        <div className="form-group">
                                            <StableLocaleText as="label" locale={locale} visible={localeVisible} className="di-field-label" en="Match ID" zh="比賽編號" />
                                            <input list="match-ids" type="text" value={matchId} onChange={e => setMatchId(e.target.value)} placeholder="A1001" />
                                            <datalist id="match-ids">
                                                {Object.keys(currentMatches).map(mId => (
                                                    <option key={mId} value={mId} />
                                                ))}
                                            </datalist>
                                        </div>
                                        <div className="form-group">
                                            <StableLocaleText as="label" locale={locale} visible={localeVisible} className="di-field-label" en="Next Match ID" zh="下一場比賽編號" />
                                            <input type="text" value={nextMatchId} onChange={e => setNextMatchId(e.target.value)} placeholder={locale === 'en' ? 'e.g. A2001 (optional)' : '例如: A2001（選填）'} />
                                        </div>
                                        <div className="form-group">
                                            <StableLocaleText as="label" locale={locale} visible={localeVisible} className="di-field-label" en="Next Match Slot" zh="下一場席位" />
                                            <select value={nextMatchSlot || ''} onChange={e => setNextMatchSlot(e.target.value)}>
                                                <option value="">{locale === 'en' ? '(optional)' : '（選填）'}</option>
                                                <option value="blue">{locale === 'en' ? 'Blue' : '藍方'}</option>
                                                <option value="red">{locale === 'en' ? 'Red' : '紅方'}</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="fieldset-content">
                                        <div className="form-group">
                                            <StableLocaleText as="label" locale={locale} visible={localeVisible} className="di-field-label" en="Round Duration (sec)" zh="回合秒數" />
                                            <input type="number" value={roundDuration} onChange={e => setRoundDuration(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <StableLocaleText as="label" locale={locale} visible={localeVisible} className="di-field-label" en="Rest Duration (sec)" zh="休息秒數" />
                                            <input type="number" value={restDuration} onChange={e => setRestDuration(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="fieldset-content">
                                        <div className="form-group">
                                            <StableLocaleText as="label" locale={locale} visible={localeVisible} className="di-field-label" en="Point Gap" zh="分差" />
                                            <input type="number" value={maxPointGap} onChange={e => setMaxPointGap(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <StableLocaleText as="label" locale={locale} visible={localeVisible} className="di-field-label" en="Max Gam-jeom" zh="犯規上限" />
                                            <input type="number" value={maxGamjeom} onChange={e => setMaxGamjeom(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <StableLocaleText as="label" locale={locale} visible={localeVisible} className="di-field-label" en="IVR Quota" zh="IVR 配額" />
                                            <input type="number" min="1" placeholder={locale === 'en' ? 'Empty = unlimited' : '留空 = 無限'} value={ivrQuota} onChange={e => setIvrQuota(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </fieldset>

                            <fieldset className="competitor-group blue">
                                <legend>
                                    <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Blue Competitor" zh="藍方選手" />
                                </legend>
                                <div className="fieldset-content">
                                    <div className="form-group">
                                        <StableLocaleText as="label" locale={locale} visible={localeVisible} className="di-field-label" en="Name" zh="姓名" />
                                        <input type="text" value={blueName} onChange={e => setBlueName(e.target.value)} placeholder={locale === 'en' ? 'Blue player name' : '藍方選手姓名'} />
                                    </div>
                                    <div className="form-group">
                                        <StableLocaleText as="label" locale={locale} visible={localeVisible} className="di-field-label" en="Affiliated Club" zh="屬會" />
                                        <input type="text" value={blueAffiliatedClub} onChange={e => setBlueAffiliatedClub(e.target.value)} placeholder={locale === 'en' ? 'Club (optional)' : '屬會（選填）'} />
                                    </div>
                                    <div className="form-group">
                                        <StableLocaleText as="label" locale={locale} visible={localeVisible} className="di-field-label" en="Source Match ID" zh="來源比賽編號" />
                                        <input type="text" value={bluePreviousMatch} onChange={e => setBluePreviousMatch(e.target.value)} placeholder={locale === 'en' ? 'Source match (optional)' : '來源比賽（選填）'} />
                                    </div>
                                </div>
                            </fieldset>
                            
                            <fieldset className="competitor-group red">
                                <legend>
                                    <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Red Competitor" zh="紅方選手" />
                                </legend>
                                <div className="fieldset-content">
                                    <div className="form-group">
                                        <StableLocaleText as="label" locale={locale} visible={localeVisible} className="di-field-label" en="Name" zh="姓名" />
                                        <input type="text" value={redName} onChange={e => setRedName(e.target.value)} placeholder={locale === 'en' ? 'Red player name' : '紅方選手姓名'} />
                                    </div>
                                    <div className="form-group">
                                        <StableLocaleText as="label" locale={locale} visible={localeVisible} className="di-field-label" en="Affiliated Club" zh="屬會" />
                                        <input type="text" value={redAffiliatedClub} onChange={e => setRedAffiliatedClub(e.target.value)} placeholder={locale === 'en' ? 'Club (optional)' : '屬會（選填）'} />
                                    </div>
                                    <div className="form-group">
                                        <StableLocaleText as="label" locale={locale} visible={localeVisible} className="di-field-label" en="Source Match ID" zh="來源比賽編號" />
                                        <input type="text" value={redPreviousMatch} onChange={e => setRedPreviousMatch(e.target.value)} placeholder={locale === 'en' ? 'Source match (optional)' : '來源比賽（選填）'} />
                                    </div>
                                </div>
                            </fieldset>
                        </div>
                        
                        <div className="di-action-buttons">
                            <Button angle={260} onClick={handleAddMatch} icon={<PlusCircle size="1.15cqi" />} fontSize="1.05cqi" style={{ flex: 1, whiteSpace: "nowrap", padding: "0.55cqi 0.35cqi" }}>
                                <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Add Match" zh="新增比賽" />
                            </Button>
                            <Button angle={40} onClick={selectedMatchId ? handleLoadMatch : null} disabled={!selectedMatchId} icon={<Display size="1.15cqi" />} fontSize="1.05cqi" style={{ flex: 1, whiteSpace: "nowrap", padding: "0.55cqi 0.35cqi" }}>
                                <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Load" zh="載入" />
                            </Button>
                            <Button angle={150} onClick={() => navigate('/home')} icon={<House size="1.15cqi" />} fontSize="1.05cqi" style={{ flex: 1, whiteSpace: "nowrap", padding: "0.55cqi 0.35cqi" }}>
                                <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Home" zh="主頁" />
                            </Button>
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
                                            <option value="all">{locale === 'en' ? '📅 All Dates' : '📅 所有日期'}</option>
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
                                    icon={<Diagram3 size="0.83cqi" />} 
                                    onClick={() => setShowBracketModal(true)}
                                    fontSize="0.81cqi"
                                    style={{ padding: '0.31cqi 0.62cqi' }}
                                >
                                    <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Bracket" zh="賽程表" />
                                </Button>
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

                                    const isSelected = selectedMatchId === mId;

                                    return (
                                        <li key={mId} className={`match-row${isSelected ? ' is-selected' : ''}`}>
                                            <div
                                                className={`match-row-main${isSelected ? ' selected' : ''}`}
                                                onClick={() => setSelectedMatchId(isSelected ? null : mId)}
                                            >
                                                <div className="match-row-text">
                                                    <strong style={{ color: '#fff', marginRight: '0.21cqi' }}>{mId}:</strong>
                                                    <span style={{ color: '#3399ff' }}>{getDisplayText(blue)}</span>
                                                    <span style={{ color: '#fff', margin: '0 0.5cqi', fontSize: '1cqi' }}>VS</span>
                                                    <span style={{ color: '#ff3b30' }}>{getDisplayText(red)}</span>
                                                </div>
                                            </div>
                                            <div className="match-row-delete">
                                                <Button
                                                    angle={350}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        promptDeleteMatch();
                                                    }}
                                                    icon={<Trash size="0.83cqi" />}
                                                    style={{ whiteSpace: 'nowrap', padding: '0.35cqi 0.55cqi', fontSize: '0.72cqi', margin: 0, backgroundColor: '#ff3b30' }}
                                                >
                                                    <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Delete" zh="刪除" />
                                                </Button>
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
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ color: '#ccc', fontSize: '0.72cqi' }}>IVR Quota (留空=無限)</label>
                                    <input type="number" min="1" placeholder="留空 = 無限" value={newIvrQuota} onChange={e => setNewIvrQuota(e.target.value)} style={{ width: '100%', padding: '0.42cqi', borderRadius: '0.21cqi', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }} />
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
        </div>
    );
}

export default DataImport;
