import React, { useState, useEffect } from 'react';
import { database } from '../../firebase';
import { usePopup } from '../../Context/PopupContext';
import './DataImport.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useEventSession } from '../../Context/EventSessionContext';
import { StableLocaleText, useAlternatingLocale } from '../../Components/AlternatingLocale/AlternatingLocale';
import { fetchEventList } from '../../services/eventIndexFirebase';
import { setCourtField } from '../../services/courtFirebase';
import {
    mirrorMatchFlatArtifacts,
    removeMatchFlatArtifacts,
    fetchMatchesForEvent,
} from '../../services/matchFirebase';
import {
    listAvailableMatchDates,
    filterMatchIdsByDate,
} from './matchListUtils';
import {
    deriveMatchFormFields,
    buildMatchFromForm,
    applyMatchFormFields,
    clearMatchFormCompetitorFields,
} from './matchFormHelpers';
import MatchActionButtons from './MatchActionButtons';
import MatchConfigForm from './MatchConfigForm';
import MatchesList from './MatchesList';
import BracketView from './BracketView';

const DataImport = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { session } = useEventSession(); 
    const [eventsList, setEventsList] = useState([]);
    const [eventName, setEventName] = useState('');
    const [currentMatches, setCurrentMatches] = useState({});
    const [selectedMatchId, setSelectedMatchId] = useState(null);
    const { showToast, showConfirm } = usePopup();
    const { locale, visible: localeVisible } = useAlternatingLocale();

    // Date Filter State for Matches List
    const [selectedDateFilter, setSelectedDateFilter] = useState('all');

    const [showBracketModal, setShowBracketModal] = useState(false);
    const [bracketZoom, setBracketZoom] = useState(1);

    const [isDeleting, setIsDeleting] = useState(false);

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
            applyMatchFormFields(deriveMatchFormFields(currentMatches[matchId]), {
                setNextMatchId,
                setNextMatchSlot,
                setMaxPointGap,
                setMaxGamjeom,
                setRoundDuration,
                setRestDuration,
                setIvrQuota,
                setBlueName,
                setBlueAffiliatedClub,
                setBluePreviousMatch,
                setRedName,
                setRedAffiliatedClub,
                setRedPreviousMatch,
            });
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
            const newMatch = buildMatchFromForm({
                matchId,
                nextMatchId,
                nextMatchSlot,
                maxPointGap,
                maxGamjeom,
                roundDuration,
                restDuration,
                ivrQuota,
                blueName,
                blueAffiliatedClub,
                bluePreviousMatch,
                redName,
                redAffiliatedClub,
                redPreviousMatch,
            });

            // Stage 5+: flat matches/config + matchLive + matchIndex only.
            await mirrorMatchFlatArtifacts(database, eventName, matchId, newMatch);

            showToast(`Match ${matchId} added to event ${eventName} in Firebase!`);
            setCurrentMatches(prev => ({...prev, [matchId]: newMatch}));

            clearMatchFormCompetitorFields({
                setMatchId,
                setBlueName,
                setBlueAffiliatedClub,
                setRedName,
                setRedAffiliatedClub,
                setNextMatchId,
                setNextMatchSlot,
                setBluePreviousMatch,
                setRedPreviousMatch,
            });

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

                            <MatchActionButtons
                                locale={locale}
                                localeVisible={localeVisible}
                                selectedMatchId={selectedMatchId}
                                onAddMatch={handleAddMatch}
                                onLoadMatch={handleLoadMatch}
                                onHome={() => navigate('/home')}
                            />
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

        </div>
    );
}

export default DataImport;
