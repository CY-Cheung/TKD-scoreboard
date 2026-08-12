import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ref, onValue, update, get } from "firebase/database";
import { database } from "../../firebase";
import "./Screen.css";
import "../../App.css";
import Edit from "./Edit";
import QRCodeDisplay from "../../Components/QRCodeDisplay/QRCodeDisplay";
import { RecordCircle } from "react-bootstrap-icons";
import { startNextRound, startTechCardAnnouncement, finalizeTechCardAnnouncement, startKyeShi, stopKyeShi, startIvrAnnouncement, finalizeIvrAnnouncement, getEffectiveIvrRemaining } from "../../Api";
import TechnicalCardAnnouncement from "../../Components/TechnicalCardFlow/TechnicalCardAnnouncement";
import IVRAnnouncement from "../../Components/IVRFlow/IVRAnnouncement";
import { getScoreValue } from "../../domain/scoreMath.js";
import {
    determineDominantSide,
    isMatchFinal,
    resolveMatchRules,
} from "../../domain/matchRules.js";
import { formatTime } from "./formatTime";
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
import VoteLogRows from "./VoteLogRows";
import PlayerNameCell from "./PlayerNameCell";
import ScreenIvrStatus from "./ScreenIvrStatus";
import SideRoundHistory from "./SideRoundHistory";
import ScreenToasts from "./ScreenToasts";
import ScreenUnconfigured from "./ScreenUnconfigured";
import { getTimeoutStyle } from "./getTimeoutStyle";
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

    const renderTimerContent = () => {
        if (winReason) return winReason;
        if (!isMatchLoaded) return "0:00";
        return formatTime(displayTime);
    };

    const timeoutStyle = getTimeoutStyle({ isMatchLoaded, isPaused, isResting });

    return (
        <>
            <div className="screen" onClick={() => !showEdit && !showQRCode && document.documentElement.requestFullscreen()}>
                <div className="screen-floating-top-bar" style={{ position: 'absolute', bottom: '100%', left: 0, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'calc(var(--screen-height) * 0.03) calc(var(--screen-width) * 0.03)', zIndex: 100, boxSizing: 'border-box', color: 'rgba(255,255,255,0.5)', fontFamily: 'Outfit, sans-serif' }}>
                    <div style={{ fontSize: 'calc(var(--screen-width) * 0.018)', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
                        {eventName || selectedEvent || "No Event Selected"}
                    </div>
                </div>

                {/* Top Section: Player Names */}
                <div className={`top ${isResting ? 'rest-mode' : ''}`} style={{ flexDirection: direction }}>
                    <div className="red-name red-bg name-font"><PlayerNameCell competitor={config.competitors?.red} /></div>
                    <div className="blue-name blue-bg name-font"><PlayerNameCell competitor={config.competitors?.blue} /></div>
                </div>

                {/* Middle Section: Scores and Match Info */}
                <div className="middle" style={{ flexDirection: direction }}>
                    {/* Red Side: Log */}
                    <div className="red-log red-bg">
                        <div className="log-records-container" style={{ flexGrow: 1, overflowY: 'scroll', display: 'flex', flexDirection: 'column' }}>
                            {matchData && (
                                <VoteLogRows
                                    side="red"
                                    direction={direction}
                                    votes={matchData.votes}
                                    recentScores={matchData.recentScores}
                                    now={now}
                                />
                            )}
                        </div>
                    </div>

                    {/* Red Side: Score */}
                    <div className={'red-score-text red-score-bg score-font cursor-target'} style={{ color: redScoreColor }} onClick={() => setShowEdit(true)}>
                        {isResting || isFinal ? (
                            <SideRoundHistory color="red" roundScores={roundScores} roundWins={roundWins} />
                        ) : redTotalScore}
                    </div>

                    {/* Center: Match Timer */}
                    <div className="match-info-middle">
                        <div className="match cursor-target" onClick={toggleDirection}>
                            <div className="match-font">MATCH</div>
                            <div className="match-number">{matchNumber}</div>
                        </div>
                        <div className="timer cursor-target">
                            {kyeShiRemaining !== null ? (
                                <>
                                    <div className="time-out match-font timeout-active" onClick={toggleTimer} style={{ backgroundColor: '#FFFF00', color: '#000000' }}>
                                        Kye-shi
                                    </div>
                                    <div className="game-timer timer-font" onClick={toggleTimer} style={{ color: '#FFFF00' }}>
                                        {`${Math.floor(kyeShiRemaining / 60)}:${(kyeShiRemaining % 60).toString().padStart(2, '0')}`}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="game-timer timer-font" onClick={toggleTimer} style={{ color: timerColor }}>
                                        {renderTimerContent()}
                                    </div>
                                    <div className={`time-out match-font ${isMatchLoaded && !isPaused ? "timeout-active" : ""} ${isResting ? 'rest-mode' : ''}`} onClick={toggleTimer} style={timeoutStyle}>
                                        {isResting ? 'REST TIME' : 'Time out'}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Blue Side: Score */}
                    <div className={'blue-score-text blue-score-bg score-font cursor-target'} style={{ color: blueScoreColor }} onClick={() => setShowEdit(true)}>
                        {isResting || isFinal ? (
                            <SideRoundHistory color="blue" roundScores={roundScores} roundWins={roundWins} />
                        ) : blueTotalScore}
                    </div>

                    {/* Blue Side: Log */}
                    <div className="blue-log blue-bg">
                        <div className="log-records-container" style={{ flexGrow: 1, overflowY: 'scroll', display: 'flex', flexDirection: 'column' }}>
                            {matchData && (
                                <VoteLogRows
                                    side="blue"
                                    direction={direction}
                                    votes={matchData.votes}
                                    recentScores={matchData.recentScores}
                                    now={now}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Gamjeom, IVR Logo, and Round */}
                <div className="bottom" style={{ flexDirection: direction }}>
                    {/* Red Side: Gam-jeom */}
                    <div className="red-gamjeom red-bg cursor-target" onClick={() => setShowEdit(true)}>
                        <div className="gamjeom-number">{redGamJeom}</div>
                        <div className="gamjeom-font">GAM-JEOM</div>
                    </div>

                    {/* Red Side: IVR Logo */}
                    <div className="red-score-info red-bg cursor-target" onClick={() => setShowEdit(true)}>
                        <ScreenIvrStatus remaining={redIvrRemaining} />
                    </div>

                    {/* Center: Round Info */}
                    <div className="match-info-bottom">
                        <div className="round-info">
                            <div className="match-font">ROUND</div>
                            <div className="round-number-row">
                                <div className="round-win-marks round-win-marks--left" aria-label={`${direction === 'row' ? 'Red' : 'Blue'} round wins`}>
                                    {Array.from({ length: Math.max(0, Math.min(2, direction === 'row' ? roundWins.red : roundWins.blue)) }).map((_, i) => (
                                        <RecordCircle key={`left-win-${i}`} className="round-win-icon" aria-hidden />
                                    ))}
                                </div>
                                <div className="round-number">{currentRound}</div>
                                <div className="round-win-marks round-win-marks--right" aria-label={`${direction === 'row' ? 'Blue' : 'Red'} round wins`}>
                                    {Array.from({ length: Math.max(0, Math.min(2, direction === 'row' ? roundWins.blue : roundWins.red)) }).map((_, i) => (
                                        <RecordCircle key={`right-win-${i}`} className="round-win-icon" aria-hidden />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Blue Side: IVR Logo */}
                    <div className="blue-score-info blue-bg cursor-target" onClick={() => setShowEdit(true)}>
                        <ScreenIvrStatus remaining={blueIvrRemaining} />
                    </div>

                    {/* Blue Side: Gam-jeom */}
                    <div className="blue-gamjeom blue-bg cursor-target" onClick={() => setShowEdit(true)}>
                        <div className="gamjeom-number">{blueGamJeom}</div>
                        <div className="gamjeom-font">GAM-JEOM</div>
                    </div>
                </div>
            </div>

            {/* Edit Drawer Modal */}
            <Edit
                visible={showEdit}
                setVisible={setShowEdit}
                eventName={selectedEvent}
                matchId={currentMatchId}
                matchData={matchData}
                dominantSide={dominantSide}
                setShowQRCode={setShowQRCode}
                occupiedRefereesCount={occupiedRefereesCount}
                toggleDirection={toggleDirection}
                toggleKyeShi={toggleKyeShi}
                kyeShiActive={isKyeShiActive}
                onTechCardConfirm={handleTechCardConfirm}
                isTechnicalCardFlowActive={isTechCardFlowActive}
                onIvrConfirm={handleIvrConfirm}
                isIvrFlowActive={isIvrFlowActive}
                eventSettings={eventSettings}
            />

            <TechnicalCardAnnouncement
                visible={techCardAnnouncement !== null}
                side={techCardAnnouncement?.side}
                decision={techCardAnnouncement?.decision}
                startedAt={techCardAnnouncement?.startedAt}
                onComplete={handleTechCardAnnouncementComplete}
            />

            <IVRAnnouncement
                visible={ivrAnnouncement !== null}
                side={ivrAnnouncement?.side}
                decision={ivrAnnouncement?.decision}
                startedAt={ivrAnnouncement?.startedAt}
                ivrRemaining={getEffectiveIvrRemaining(
                    matchData?.stats,
                    ivrAnnouncement?.side,
                    eventSettings,
                    matchRules
                )}
                onComplete={handleIvrAnnouncementComplete}
            />

            {/* Controller Connection QR Code Modal */}
            <QRCodeDisplay
                eventId={selectedEvent}
                eventName={eventName}
                courtId={selectedCourt}
                matchId={currentMatchId}
                visible={showQRCode}
                onClose={() => setShowQRCode(false)}
                refereesData={refereesData}
                refereeMode={refereeMode}
            />

            <ScreenToasts messages={toastMessages} />
        </>
    );
}

export default Screen;