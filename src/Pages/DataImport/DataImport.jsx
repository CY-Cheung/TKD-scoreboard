import React, { useState, useEffect, useRef } from 'react';
import { ref, set } from "firebase/database";
import { database } from '../../firebase';
import { usePopup } from '../../Context/PopupContext';
import './DataImport.css';
import Button from '../../Components/Button/Button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useEventSession } from '../../Context/EventSessionContext';
import { PlusCircle, House, Display } from 'react-bootstrap-icons';
import { parseHktkdaPdfFile } from '../../Utils/pdfParser';
import { appendIvrQuotaToSettings, appendIvrQuotaToRules, formatIvrQuotaForInput } from '../../Api';
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
    setCourtField,
    mirrorCourtsMapToFlat,
    eventMetaPayloadForWrite,
} from '../../services/courtFirebase';
import {
    mirrorMatchFlatArtifacts,
    removeMatchFlatArtifacts,
    fetchMatchesForEvent,
} from '../../services/matchFirebase';
import { parseName } from './parseName';
import {
    listAvailableMatchDates,
    filterMatchIdsByDate,
} from './matchListUtils';
import MatchConfigForm from './MatchConfigForm';
import MatchesList from './MatchesList';
import BracketView from './BracketView';
import CreateEventModal from './CreateEventModal';

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
    const availableDates = listAvailableMatchDates(currentMatches);

    // Filter match IDs by selected date
    const filteredMatchIds = filterMatchIdsByDate(
        currentMatches,
        selectedDateFilter
    );

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
                // Stage 5+: events/{id} meta + settings only; matches → flat.
                await set(
                    ref(database, `events/${record.id}`),
                    eventMetaPayloadForWrite(record.data)
                );
                await writeEventIndexEntry(database, record.id, record.data);
                await mirrorCourtsMapToFlat(database, record.id, record.data.courts);
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

            // Stage 5+: flat matches/config + matchLive + matchIndex only.
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
            await setCourtField(
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
    const eventDisplayName =
        eventsList.find((e) => e.id === eventName)?.displayName ||
        eventName ||
        'Event';

    return (
        <div className="di-container aurora-bg" onDoubleClick={toggleFullScreen}>
            <div className="di-content-wrapper glass-card">
                {showBracketModal ? (
                    <BracketView
                        locale={locale}
                        localeVisible={localeVisible}
                        eventTitle={eventDisplayName}
                        currentMatches={currentMatches}
                        bracketZoom={bracketZoom}
                        setBracketZoom={setBracketZoom}
                        onBack={() => {
                            setShowBracketModal(false);
                            setBracketZoom(1);
                        }}
                    />
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

                            <MatchConfigForm
                                locale={locale}
                                localeVisible={localeVisible}
                                currentMatches={currentMatches}
                                matchId={matchId}
                                setMatchId={setMatchId}
                                nextMatchId={nextMatchId}
                                setNextMatchId={setNextMatchId}
                                nextMatchSlot={nextMatchSlot}
                                setNextMatchSlot={setNextMatchSlot}
                                roundDuration={roundDuration}
                                setRoundDuration={setRoundDuration}
                                restDuration={restDuration}
                                setRestDuration={setRestDuration}
                                maxPointGap={maxPointGap}
                                setMaxPointGap={setMaxPointGap}
                                maxGamjeom={maxGamjeom}
                                setMaxGamjeom={setMaxGamjeom}
                                ivrQuota={ivrQuota}
                                setIvrQuota={setIvrQuota}
                                blueName={blueName}
                                setBlueName={setBlueName}
                                blueAffiliatedClub={blueAffiliatedClub}
                                setBlueAffiliatedClub={setBlueAffiliatedClub}
                                bluePreviousMatch={bluePreviousMatch}
                                setBluePreviousMatch={setBluePreviousMatch}
                                redName={redName}
                                setRedName={setRedName}
                                redAffiliatedClub={redAffiliatedClub}
                                setRedAffiliatedClub={setRedAffiliatedClub}
                                redPreviousMatch={redPreviousMatch}
                                setRedPreviousMatch={setRedPreviousMatch}
                            />

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

                        <MatchesList
                            locale={locale}
                            localeVisible={localeVisible}
                            eventDisplayName={eventDisplayName}
                            availableDates={availableDates}
                            selectedDateFilter={selectedDateFilter}
                            onDateFilterChange={setSelectedDateFilter}
                            onOpenBracket={() => setShowBracketModal(true)}
                            filteredMatchIds={filteredMatchIds}
                            currentMatches={currentMatches}
                            selectedMatchId={selectedMatchId}
                            onSelectMatch={setSelectedMatchId}
                            onDeleteMatch={promptDeleteMatch}
                        />
                    </div>
                )}
            </div>

            {showCreateEventModal && (
                <CreateEventModal
                    fileInputRef={fileInputRef}
                    isParsingPdf={isParsingPdf}
                    pdfParseResult={pdfParseResult}
                    newEventId={newEventId}
                    setNewEventId={setNewEventId}
                    newEventName={newEventName}
                    setNewEventName={setNewEventName}
                    newSetupPassword={newSetupPassword}
                    setNewSetupPassword={setNewSetupPassword}
                    newMaxPointGap={newMaxPointGap}
                    setNewMaxPointGap={setNewMaxPointGap}
                    newMaxGamjeom={newMaxGamjeom}
                    setNewMaxGamjeom={setNewMaxGamjeom}
                    newRoundDuration={newRoundDuration}
                    setNewRoundDuration={setNewRoundDuration}
                    newRestDuration={newRestDuration}
                    setNewRestDuration={setNewRestDuration}
                    newIvrQuota={newIvrQuota}
                    setNewIvrQuota={setNewIvrQuota}
                    onFileSelect={handleFileSelect}
                    onSubmit={handleCreateEvent}
                    onCancel={() => setShowCreateEventModal(false)}
                />
            )}
        </div>
    );
}

export default DataImport;
