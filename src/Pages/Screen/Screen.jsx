import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ref, onValue, update, get } from "firebase/database";
import { database } from "../../firebase";
import "./Screen.css";
import "../../App.css";
import { startNextRound, startTechCardAnnouncement, finalizeTechCardAnnouncement, startKyeShi, stopKyeShi, startIvrAnnouncement, finalizeIvrAnnouncement, getEffectiveIvrRemaining } from "../../Api";
import { getScoreValue } from "../../domain/scoreMath.js";
import {
    determineDominantSide,
    isMatchFinal,
    resolveMatchRules,
} from "../../domain/matchRules.js";
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
    SEAT_HEARTBEAT_INTERVAL_MS,
} from "../Controller/seatGrab";
import ScreenUnconfigured from "./ScreenUnconfigured";
import ScreenBottomBar from "./ScreenBottomBar";
import ScreenEventTopBar from "./ScreenEventTopBar";
import ScreenTopNames from "./ScreenTopNames";
import ScreenMiddleBoard from "./ScreenMiddleBoard";
import ScreenOverlayStack from "./ScreenOverlayStack";
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
    const [now, setNow] = useState(Date.now());

    const kyeShiRemaining = useMemo(() => {
        const kyeShi = matchData?.state?.kyeShi;
        if (!kyeShi?.startedAt) return null;
        const elapsed = Math.floor((now - kyeShi.startedAt) / 1000);
        const remaining = (kyeShi.duration ?? 60) - elapsed;
        return remaining > 0 ? remaining : null;
    }, [matchData?.state?.kyeShi, now]);

    const isKyeShiActive = Boolean(matchData?.state?.kyeShi?.startedAt);

    // Update 'now' every 100ms for UI expiry checks
    useEffect(() => {
        const intervalId = setInterval(() => {
            setNow(Date.now());
        }, 100);
        return () => clearInterval(intervalId);
    }, []);

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

    // Clear toasts after 4 seconds
    useEffect(() => {
        if (toastMessages.length > 0) {
            const timer = setTimeout(() => {
                setToastMessages(prev => prev.slice(1));
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [toastMessages]);

    useEffect(() => {
        const kyeShi = matchData?.state?.kyeShi;
        if (!kyeShi?.startedAt || !selectedEvent || !currentMatchId) return;
        const remaining = (kyeShi.duration ?? 60) - Math.floor((now - kyeShi.startedAt) / 1000);
        if (remaining <= 0) {
            stopKyeShi(selectedEvent, currentMatchId);
        }
    }, [matchData?.state?.kyeShi, now, selectedEvent, currentMatchId]);

    // Listen to referees status on flat courts; hide stale ghosts
    useEffect(() => {
        if (!selectedEvent || !selectedCourt) return;
        let rawReferees = {};

        const applyReferees = (val) => {
            rawReferees = val || {};
            const currentData = filterLiveReferees(rawReferees);
            const prevData = prevRefereesRef.current;

            // Check for disconnections
            const disconnections = [];
            let occupiedCount = 0;
            ['J1', 'J2', 'J3'].forEach(seat => {
                if (currentData[seat]) occupiedCount++;
                if (prevData[seat] && !currentData[seat]) {
                    disconnections.push(seat);
                }
            });

            if (disconnections.length > 0) {
                const msg = `⚠️ Referee ${disconnections.join(', ')} disconnected!`;
                setToastMessages(prev => [...prev, { id: Date.now(), text: msg }]);
            }

            // Auto-downgrade check
            if (occupiedCount < 2) {
                getCourt(
                    database,
                    selectedEvent,
                    selectedCourt,
                    ["config", "refereeMode"]
                ).then((mode) => {
                    if (mode === 'multiple') {
                        updateCourtField(
                            database,
                            selectedEvent,
                            selectedCourt,
                            "config",
                            { refereeMode: 'single' }
                        );
                        setToastMessages(prev => [...prev, { id: Date.now() + 1, text: "Only 1 referee remaining. Auto-downgraded to Single Referee Mode." }]);
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

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === "Space") { e.preventDefault(); toggleTimer(); }
            if (e.key === "\\") { toggleDirection(); }
            if (e.key === "e" || e.key === "E") { setShowEdit(prev => !prev); }
            if (e.key === "q" || e.key === "Q") { setShowQRCode(prev => !prev); }
            if (e.key === "k" || e.key === "K") {
                toggleKyeShi();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isMatchLoaded, selectedEvent, currentMatchId, matchData]);

    const { state = {}, config = {}, stats = {} } = matchData || {};
    const { phase = 'ROUND', currentRound: matchCurrentRound, winReason, isFinished, isPaused = true } = state;
    const { roundScores = {}, roundWins: matchRoundWins = {} } = stats;
    const resolvedRules = resolveMatchRules(config?.rules);

    const redStats = stats.red;
    const blueStats = stats.blue;

    const dominantSide = useMemo(() => {
        if (!isMatchLoaded) return 'none';
        return determineDominantSide(redStats, blueStats, resolvedRules.maxGamjeom);
    }, [redStats, blueStats, isMatchLoaded, resolvedRules.maxGamjeom]);

    // Compute occupied referee count (J1, J2, J3)
    const occupiedRefereesCount = useMemo(() => {
        let count = 0;
        if (refereesData?.J1) count++;
        if (refereesData?.J2) count++;
        if (refereesData?.J3) count++;
        return count;
    }, [refereesData]);

    if (!selectedCourt) {
        return <ScreenUnconfigured />;
    }

    const isResting = phase === 'REST';
    const roundWins = { red: matchRoundWins.red || 0, blue: matchRoundWins.blue || 0 };
    const isFinal = isMatchFinal(roundWins, resolvedRules.roundsToWin);

    const redGamJeom = stats.red?.gamjeom ?? 0;
    const blueGamJeom = stats.blue?.gamjeom ?? 0;
    const redIvrRemaining = getEffectiveIvrRemaining(stats, "red", eventSettings, matchRules);
    const blueIvrRemaining = getEffectiveIvrRemaining(stats, "blue", eventSettings, matchRules);

    const redTotalScore = isMatchLoaded ? getScoreValue(stats.red, stats.blue) : 0;
    const blueTotalScore = isMatchLoaded ? getScoreValue(stats.blue, stats.red) : 0;

    const matchNumber = config.matchId ?? "000";
    const currentRound = matchCurrentRound ?? 1;

    const timerColor = isPaused ? "#FFFF00" : "#FFFFFF";
    const redScoreColor = !isResting && dominantSide === 'red' ? '#FFFF00' : '#FFFFFF';
    const blueScoreColor = !isResting && dominantSide === 'blue' ? '#FFFF00' : '#FFFFFF';

    return (
        <>
            <div className="screen" onClick={() => !showEdit && !showQRCode && document.documentElement.requestFullscreen()}>
                <ScreenEventTopBar eventLabel={eventName || selectedEvent || "No Event Selected"} />

                <ScreenTopNames
                    direction={direction}
                    isResting={isResting}
                    redCompetitor={config.competitors?.red}
                    blueCompetitor={config.competitors?.blue}
                />

                <ScreenMiddleBoard
                    direction={direction}
                    matchData={matchData}
                    now={now}
                    isResting={isResting}
                    isFinal={isFinal}
                    redScoreColor={redScoreColor}
                    blueScoreColor={blueScoreColor}
                    redTotalScore={redTotalScore}
                    blueTotalScore={blueTotalScore}
                    roundScores={roundScores}
                    roundWins={roundWins}
                    onOpenEdit={() => setShowEdit(true)}
                    matchNumber={matchNumber}
                    kyeShiRemaining={kyeShiRemaining}
                    displayTime={displayTime}
                    winReason={winReason}
                    isPaused={isPaused}
                    isMatchLoaded={isMatchLoaded}
                    timerColor={timerColor}
                    onToggleDirection={toggleDirection}
                    onToggleTimer={toggleTimer}
                />

                <ScreenBottomBar
                    direction={direction}
                    redGamJeom={redGamJeom}
                    blueGamJeom={blueGamJeom}
                    redIvrRemaining={redIvrRemaining}
                    blueIvrRemaining={blueIvrRemaining}
                    roundWins={roundWins}
                    currentRound={currentRound}
                    onOpenEdit={() => setShowEdit(true)}
                />
            </div>

            <ScreenOverlayStack
                showEdit={showEdit}
                setShowEdit={setShowEdit}
                selectedEvent={selectedEvent}
                currentMatchId={currentMatchId}
                matchData={matchData}
                dominantSide={dominantSide}
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