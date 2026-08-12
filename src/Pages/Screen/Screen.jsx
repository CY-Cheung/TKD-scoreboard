import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../../firebase";
import "./Screen.css";
import "../../App.css";
import { startNextRound, startTechCardAnnouncement, finalizeTechCardAnnouncement, startKyeShi, stopKyeShi, startIvrAnnouncement, finalizeIvrAnnouncement } from "../../Api";
import {
    resolveMatchTimerFrame,
    buildTimerResumePatch,
    buildTimerPausePatch,
    buildRoundExpiredStatePatch,
} from "./matchTimer";
import {
    updateCourtField,
    clearRefereeSeat,
    subscribeCourt,
    subscribeCourtReferees,
    getCourt,
} from "../../services/courtFirebase";
import {
    updateMatchLiveState,
    subscribeMatchView,
    ensureMatchLiveExists,
} from "../../services/matchFirebase";
import {
    filterLiveReferees,
    listStaleRefereeSeats,
    countOccupiedRefereeSeats,
    listDisconnectedRefereeSeats,
    SEAT_HEARTBEAT_INTERVAL_MS,
} from "../Controller/seatGrab";
import ScreenUnconfigured from "./ScreenUnconfigured";
import ScreenBottomBar from "./ScreenBottomBar";
import ScreenEventTopBar from "./ScreenEventTopBar";
import ScreenTopNames from "./ScreenTopNames";
import ScreenMiddleBoard from "./ScreenMiddleBoard";
import ScreenOverlayStack from "./ScreenOverlayStack";
import { normalizeMatchView } from "./normalizeMatchView";
import { computeKyeShiRemaining } from "./kyeShiTime";
import { useNowTicker } from "./useNowTicker";
import { useToastAutoDismiss } from "./useToastAutoDismiss";
import { useScreenHotkeys } from "./useScreenHotkeys";
import {
    AUTO_DOWNGRADE_TOAST,
    buildDisconnectToastMessage,
    shouldProbeAutoDowngrade,
    shouldAutoDowngradeToSingle,
} from "./refereePresence";
import { buildScreenScoreboardModel } from "./buildScreenScoreboardModel";
import { useEventSession } from "../../Context/EventSessionContext";

const EMPTY_MATCH_RULES = Object.freeze({});

function Screen() {
    const { session } = useEventSession();
    const [matchData, setMatchData] = useState(null);
    const [direction, setDirection] = useState("row");
    const [showEdit, setShowEdit] = useState(false);
    const [showQRCode, setShowQRCode] = useState(false);
    const [displayTime, setDisplayTime] = useState(0);

    const selectedEvent = session?.eventId || sessionStorage.getItem('selectedEvent');
    const selectedCourt = session?.courtId || sessionStorage.getItem('selectedCourt');
    const [eventName, setEventName] = useState("");
    const [currentMatchId, setCurrentMatchId] = useState(null);
    const [refereesData, setRefereesData] = useState({});

    const [eventSettings, setEventSettings] = useState({});
    const [refereeMode, setRefereeMode] = useState('single');
    const [toastMessages, setToastMessages] = useState([]);
    const prevRefereesRef = useRef({});

    const techCardAnnouncement = matchData?.state?.techCardAnnouncement ?? null;
    const isTechCardFlowActive = techCardAnnouncement !== null;
    const ivrAnnouncement = matchData?.state?.ivrAnnouncement ?? null;
    const isIvrFlowActive = ivrAnnouncement !== null;
    const matchRules = matchData?.config?.rules || EMPTY_MATCH_RULES;

    const animationFrameRef = useRef();
    const isMatchLoaded = !!matchData;
    const now = useNowTicker(100);

    const kyeShiRemaining = useMemo(
        () => computeKyeShiRemaining(matchData?.state?.kyeShi, now),
        [matchData?.state?.kyeShi, now]
    );

    const isKyeShiActive = matchData?.state?.kyeShi?.startedAt != null;

    // Listen to refereeMode (prefer flat courts)
    useEffect(() => {
        if (!selectedEvent || !selectedCourt) return;
        return subscribeCourt(
            database,
            selectedEvent,
            selectedCourt,
            ["config", "refereeMode"],
            (val) => setRefereeMode(val || "single")
        );
    }, [selectedEvent, selectedCourt]);

    // Fetch Event Name + settings (narrow paths — avoid whole event tree)
    useEffect(() => {
        if (!selectedEvent) return;
        const nameRef = ref(database, `events/${selectedEvent}/EventName`);
        const settingsRef = ref(database, `events/${selectedEvent}/settings`);
        const unsubName = onValue(nameRef, (snapshot) => {
            const val = snapshot.val();
            setEventName(val || selectedEvent);
        });
        const unsubSettings = onValue(settingsRef, (snapshot) => {
            setEventSettings(snapshot.val() || {});
        });
        return () => {
            unsubName();
            unsubSettings();
        };
    }, [selectedEvent]);

    useToastAutoDismiss(toastMessages, setToastMessages, 4000);

    useEffect(() => {
        if (!matchData?.state?.kyeShi?.startedAt || !selectedEvent || !currentMatchId) return;
        if (computeKyeShiRemaining(matchData.state.kyeShi, now) != null) return;
        stopKyeShi(selectedEvent, currentMatchId);
    }, [matchData?.state?.kyeShi, now, selectedEvent, currentMatchId]);

    // Listen to referees status on flat courts; hide stale ghosts
    useEffect(() => {
        if (!selectedEvent || !selectedCourt) return;
        let rawReferees = {};

        const applyReferees = (val) => {
            rawReferees = val || {};
            const currentData = filterLiveReferees(rawReferees);
            const prevData = prevRefereesRef.current;

            const disconnections = listDisconnectedRefereeSeats(prevData, currentData);
            const occupiedCount = countOccupiedRefereeSeats(currentData);

            const disconnectMsg = buildDisconnectToastMessage(disconnections);
            if (disconnectMsg) {
                setToastMessages(prev => [...prev, { id: Date.now(), text: disconnectMsg }]);
            }

            if (shouldProbeAutoDowngrade(occupiedCount)) {
                getCourt(
                    database,
                    selectedEvent,
                    selectedCourt,
                    ["config", "refereeMode"]
                ).then((mode) => {
                    if (shouldAutoDowngradeToSingle(mode)) {
                        updateCourtField(
                            database,
                            selectedEvent,
                            selectedCourt,
                            "config",
                            { refereeMode: 'single' }
                        );
                        setToastMessages(prev => [...prev, { id: Date.now() + 1, text: AUTO_DOWNGRADE_TOAST }]);
                    }
                });
            }

            setRefereesData(currentData);
            prevRefereesRef.current = currentData;
        };

        const unsub = subscribeCourtReferees(
            database,
            selectedEvent,
            selectedCourt,
            applyReferees
        );

        // Force-kill / backgrounded phones may not run onDisconnect for minutes.
        // Clear seats whose lastSeen heartbeat went stale so QR/Screen free the slot.
        const janitorId = setInterval(() => {
            const staleSeats = listStaleRefereeSeats(rawReferees);
            staleSeats.forEach((seat) => {
                clearRefereeSeat(
                    database,
                    selectedEvent,
                    selectedCourt,
                    seat
                ).catch(() => {});
            });
            if (staleSeats.length > 0) {
                applyReferees(rawReferees);
            }
        }, SEAT_HEARTBEAT_INTERVAL_MS);

        return () => {
            unsub();
            clearInterval(janitorId);
        };
    }, [selectedEvent, selectedCourt]);

    // Ensure matchLive exists when Screen opens a match (auth required)
    useEffect(() => {
        if (!selectedEvent || !currentMatchId) return;
        let cancelled = false;
        ensureMatchLiveExists(database, selectedEvent, currentMatchId)
            .catch((err) => {
                if (cancelled) return;
                console.error("matchLive ensure failed:", err);
                setToastMessages((prev) => [
                    ...prev,
                    {
                        id: Date.now(),
                        text: "matchLive write failed — publish database.rules.json + stay Google-signed-in (see console)",
                    },
                ]);
            });
        return () => {
            cancelled = true;
        };
    }, [selectedEvent, currentMatchId]);

    useEffect(() => {
        if (!selectedEvent || !selectedCourt) return;
        return subscribeCourt(
            database,
            selectedEvent,
            selectedCourt,
            "currentMatchId",
            (newMatchId) => {
            if (newMatchId) {
                setCurrentMatchId(newMatchId);
            } else {
                setCurrentMatchId(null);
                setMatchData(null);
            }
            }
        );
    }, [selectedEvent, selectedCourt]);

    useEffect(() => {
        if (!currentMatchId || !selectedEvent) {
            setMatchData(null);
            return;
        }
        return subscribeMatchView(
            database,
            selectedEvent,
            currentMatchId,
            setMatchData
        );
    }, [currentMatchId, selectedEvent]);

    useEffect(() => {
        if (!matchData?.state) {
            setDisplayTime(0);
            return;
        }

        const state = matchData.state;

        const updateTimer = () => {
            const frame = resolveMatchTimerFrame(state, Date.now());
            setDisplayTime(frame.displayTime);

            if (!frame.continueRaf) {
                cancelAnimationFrame(animationFrameRef.current);
                if (frame.onExpire === "finalize_round") {
                    updateMatchLiveState(
                        database,
                        selectedEvent,
                        currentMatchId,
                        buildRoundExpiredStatePatch()
                    );
                } else if (frame.onExpire === "start_next_round") {
                    // Auto-start the next round when rest time ends
                    startNextRound(selectedEvent, currentMatchId);
                }
                return;
            }

            animationFrameRef.current = requestAnimationFrame(updateTimer);
        };

        animationFrameRef.current = requestAnimationFrame(updateTimer);

        return () => cancelAnimationFrame(animationFrameRef.current);
    }, [matchData?.state, selectedEvent, currentMatchId]);

    const toggleDirection = () => setDirection((prev) => (prev === "row" ? "row-reverse" : "row"));

    const handleTechCardConfirm = useCallback(({ side, decision }) => {
        if (showQRCode || !selectedEvent || !currentMatchId || techCardAnnouncement || ivrAnnouncement) return;
        startTechCardAnnouncement(selectedEvent, currentMatchId, { side, decision });
    }, [showQRCode, selectedEvent, currentMatchId, techCardAnnouncement, ivrAnnouncement]);

    const handleTechCardAnnouncementComplete = useCallback(() => {
        if (!selectedEvent || !currentMatchId) return;
        finalizeTechCardAnnouncement(selectedEvent, currentMatchId);
    }, [selectedEvent, currentMatchId]);

    const handleIvrConfirm = useCallback(({ side, decision }) => {
        if (showQRCode || !selectedEvent || !currentMatchId || ivrAnnouncement || techCardAnnouncement) return;
        startIvrAnnouncement(selectedEvent, currentMatchId, { side, decision });
    }, [showQRCode, selectedEvent, currentMatchId, ivrAnnouncement, techCardAnnouncement]);

    const handleIvrAnnouncementComplete = useCallback(() => {
        if (!selectedEvent || !currentMatchId) return;
        finalizeIvrAnnouncement(selectedEvent, currentMatchId, eventSettings);
    }, [selectedEvent, currentMatchId, eventSettings]);

    const toggleTimer = async (force = false) => {
        if (!isMatchLoaded) return;
        if (isKyeShiActive && !force) return;
        const currentState = matchData?.state || {};
        const isPaused = currentState.isPaused ?? true;
        const now = Date.now();

        if (isPaused) {
            updateMatchLiveState(
                database,
                selectedEvent,
                currentMatchId,
                buildTimerResumePatch(now)
            );
        } else {
            updateMatchLiveState(
                database,
                selectedEvent,
                currentMatchId,
                buildTimerPausePatch(currentState, now)
            );
        }
    };

    const toggleKyeShi = useCallback(() => {
        if (!selectedEvent || !currentMatchId) return;
        if (matchData?.state?.kyeShi?.startedAt) {
            stopKyeShi(selectedEvent, currentMatchId);
            return;
        }
        startKyeShi(selectedEvent, currentMatchId);
        if (matchData && !matchData.state.isPaused) {
            toggleTimer(true);
        }
    }, [selectedEvent, currentMatchId, matchData]);

    useScreenHotkeys(
        {
            onToggleTimer: toggleTimer,
            onToggleDirection: toggleDirection,
            onToggleEdit: () => setShowEdit((prev) => !prev),
            onToggleQr: () => setShowQRCode((prev) => !prev),
            onToggleKyeShi: toggleKyeShi,
        },
        [isMatchLoaded, selectedEvent, currentMatchId, matchData, toggleKyeShi]
    );

    // Nullish config/state/stats break default destructuring (`{ config = {} } = { config: null }`
    // keeps null). Live can arrive before flat config and used to crash Screen.
    const { state, config, stats } = normalizeMatchView(matchData);

    const occupiedRefereesCount = useMemo(
        () => countOccupiedRefereeSeats(refereesData),
        [refereesData]
    );

    if (!selectedCourt) {
        return <ScreenUnconfigured />;
    }

    const board = buildScreenScoreboardModel({
        state,
        config,
        stats,
        isMatchLoaded,
        eventSettings,
        matchRules,
    });

    return (
        <>
            <div className="screen" onClick={() => !showEdit && !showQRCode && document.documentElement.requestFullscreen()}>
                <ScreenEventTopBar eventLabel={eventName || selectedEvent || "No Event Selected"} />

                <ScreenTopNames
                    direction={direction}
                    isResting={board.isResting}
                    redCompetitor={board.redCompetitor}
                    blueCompetitor={board.blueCompetitor}
                />

                <ScreenMiddleBoard
                    direction={direction}
                    matchData={matchData}
                    now={now}
                    isResting={board.isResting}
                    isFinal={board.isFinal}
                    redScoreColor={board.redScoreColor}
                    blueScoreColor={board.blueScoreColor}
                    redTotalScore={board.redTotalScore}
                    blueTotalScore={board.blueTotalScore}
                    roundScores={board.roundScores}
                    roundWins={board.roundWins}
                    onOpenEdit={() => setShowEdit(true)}
                    matchNumber={board.matchNumber}
                    kyeShiRemaining={kyeShiRemaining}
                    displayTime={displayTime}
                    winReason={board.winReason}
                    isPaused={board.isPaused}
                    isMatchLoaded={isMatchLoaded}
                    timerColor={board.timerColor}
                    onToggleDirection={toggleDirection}
                    onToggleTimer={toggleTimer}
                />

                <ScreenBottomBar
                    direction={direction}
                    redGamJeom={board.redGamJeom}
                    blueGamJeom={board.blueGamJeom}
                    redIvrRemaining={board.redIvrRemaining}
                    blueIvrRemaining={board.blueIvrRemaining}
                    roundWins={board.roundWins}
                    currentRound={board.currentRound}
                    onOpenEdit={() => setShowEdit(true)}
                />
            </div>

            <ScreenOverlayStack
                showEdit={showEdit}
                setShowEdit={setShowEdit}
                selectedEvent={selectedEvent}
                currentMatchId={currentMatchId}
                matchData={matchData}
                dominantSide={board.dominantSide}
                setShowQRCode={setShowQRCode}
                occupiedRefereesCount={occupiedRefereesCount}
                toggleDirection={toggleDirection}
                toggleKyeShi={toggleKyeShi}
                isKyeShiActive={isKyeShiActive}
                handleTechCardConfirm={handleTechCardConfirm}
                isTechCardFlowActive={isTechCardFlowActive}
                handleIvrConfirm={handleIvrConfirm}
                isIvrFlowActive={isIvrFlowActive}
                eventSettings={eventSettings}
                techCardAnnouncement={techCardAnnouncement}
                handleTechCardAnnouncementComplete={handleTechCardAnnouncementComplete}
                ivrAnnouncement={ivrAnnouncement}
                matchRules={matchRules}
                handleIvrAnnouncementComplete={handleIvrAnnouncementComplete}
                eventName={eventName}
                selectedCourt={selectedCourt}
                showQRCode={showQRCode}
                refereesData={refereesData}
                refereeMode={refereeMode}
                toastMessages={toastMessages}
            />
        </>
    );
}

export default Screen;
