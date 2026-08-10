import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ref, onValue, update, get } from "firebase/database";
import { database } from "../../firebase";
import "./Screen.css";
import "../../App.css";
import Edit from "./Edit";
import QRCodeDisplay from "../../Components/QRCodeDisplay/QRCodeDisplay";
import Button from "../../Components/Button/Button";
import { ArrowLeft, Files, File, FileExcel, RecordCircle } from "react-bootstrap-icons";
import { startNextRound, startTechCardAnnouncement, finalizeTechCardAnnouncement, startKyeShi, stopKyeShi, startIvrAnnouncement, finalizeIvrAnnouncement, getEffectiveIvrRemaining, isIvrUnlimited } from "../../Api";
import TechnicalCardAnnouncement from "../../Components/TechnicalCardFlow/TechnicalCardAnnouncement";
import IVRAnnouncement from "../../Components/IVRFlow/IVRAnnouncement";
import { getScoreValue } from "../../domain/scoreMath.js";
import {
    determineDominantSide,
    isMatchFinal,
    resolveMatchRules,
} from "../../domain/matchRules.js";
import { formatTime } from "./formatTime";
import VoteLogRows from "./VoteLogRows";

function Screen() {
    const [matchData, setMatchData] = useState(null);
    const [direction, setDirection] = useState("row");
    const [showEdit, setShowEdit] = useState(false);
    const [showQRCode, setShowQRCode] = useState(false);
    const [displayTime, setDisplayTime] = useState(0);

    const [selectedEvent, setSelectedEvent] = useState(sessionStorage.getItem('selectedEvent'));
    const [eventName, setEventName] = useState("");
    const [selectedCourt, setSelectedCourt] = useState(sessionStorage.getItem('selectedCourt'));
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
    const matchRules = matchData?.config?.rules || {};

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

    // Listen to refereeMode
    useEffect(() => {
        if (!selectedEvent || !selectedCourt) return;
        const modeRef = ref(database, `events/${selectedEvent}/courts/${selectedCourt}/config/refereeMode`);
        const unsubscribe = onValue(modeRef, (snapshot) => {
            setRefereeMode(snapshot.val() || 'single');
        });
        return () => unsubscribe();
    }, [selectedEvent, selectedCourt]);

    // Fetch Event Name
    useEffect(() => {
        if (!selectedEvent) return;
        const eventRef = ref(database, `events/${selectedEvent}`);
        const unsubscribe = onValue(eventRef, (snapshot) => {
            const val = snapshot.val();
            if (val) {
                setEventName(val?.EventName || val?.eventName || val?.settings?.eventName || val?.name || selectedEvent);
                setEventSettings(val?.settings || {});
            } else {
                setEventName(selectedEvent);
                setEventSettings({});
            }
        });
        return () => unsubscribe();
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

    // Listen to referees status on current court
    useEffect(() => {
        if (!selectedEvent || !selectedCourt) return;
        const refereesRef = ref(database, `events/${selectedEvent}/courts/${selectedCourt}/referees`);
        const unsubscribe = onValue(refereesRef, (snapshot) => {
            const currentData = snapshot.val() || {};
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
                const modeRef = ref(database, `events/${selectedEvent}/courts/${selectedCourt}/config/refereeMode`);
                get(modeRef).then(snap => {
                    if (snap.val() === 'multiple') {
                        update(ref(database, `events/${selectedEvent}/courts/${selectedCourt}/config`), { refereeMode: 'single' });
                        setToastMessages(prev => [...prev, { id: Date.now() + 1, text: "Only 1 referee remaining. Auto-downgraded to Single Referee Mode." }]);
                    }
                });
            }

            setRefereesData(currentData);
            prevRefereesRef.current = currentData;
        });
        return () => unsubscribe();
    }, [selectedEvent, selectedCourt]);

    useEffect(() => {
        if (!selectedEvent || !selectedCourt) return;
        const courtMatchIdRef = ref(database, `events/${selectedEvent}/courts/${selectedCourt}/currentMatchId`);
        const unsubscribe = onValue(courtMatchIdRef, (snapshot) => {
            const newMatchId = snapshot.val();
            if (newMatchId) {
                setCurrentMatchId(newMatchId);
            } else {
                setCurrentMatchId(null);
                setMatchData(null);
            }
        });
        return () => unsubscribe();
    }, [selectedEvent, selectedCourt]);

    useEffect(() => {
        if (!currentMatchId || !selectedEvent) {
            setMatchData(null);
            return;
        }
        const matchRef = ref(database, `events/${selectedEvent}/matches/${currentMatchId}`);
        const unsubscribe = onValue(matchRef, (snapshot) => {
            setMatchData(snapshot.val());
        });
        return () => unsubscribe();
    }, [currentMatchId, selectedEvent]);

    useEffect(() => {
        if (!matchData?.state) {
            setDisplayTime(0);
            return;
        };

        const state = matchData.state;
        const { timer, isPaused, lastStartTime, isFinished, phase } = state;

        const updateTimer = () => {
            if (isFinished && phase !== 'REST') {
                setDisplayTime(0);
                cancelAnimationFrame(animationFrameRef.current);
                return;
            }

            if (isPaused) {
                setDisplayTime(timer || 0);
                cancelAnimationFrame(animationFrameRef.current);
                return;
            }

            const now = Date.now();
            const elapsed = Math.floor((now - lastStartTime) / 1000);
            const remaining = (timer || 0) - elapsed;

            if (remaining <= 0) {
                setDisplayTime(0);
                cancelAnimationFrame(animationFrameRef.current);

                if (phase !== 'REST') {
                    const matchStateRef = ref(database, `events/${selectedEvent}/matches/${currentMatchId}/state`);
                    update(matchStateRef, {
                        isFinished: true,
                        isPaused: true,
                        timer: 0,
                        lastStartTime: null
                    });
                } else {
                    // Auto-start the next round when rest time ends
                    startNextRound(selectedEvent, currentMatchId);
                }
            } else {
                setDisplayTime(remaining);
                animationFrameRef.current = requestAnimationFrame(updateTimer);
            }
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
        const stateRef = ref(database, `events/${selectedEvent}/matches/${currentMatchId}/state`);
        const currentState = matchData?.state || {};
        const isPaused = currentState.isPaused ?? true;

        if (isPaused) {
            update(stateRef, {
                isPaused: false,
                lastStartTime: Date.now()
            });
        } else {
            const elapsed = Math.floor((Date.now() - (currentState.lastStartTime || Date.now())) / 1000);
            const newTimer = Math.max(0, (currentState.timer || 0) - elapsed);
            update(stateRef, {
                isPaused: true,
                timer: newTimer,
                lastStartTime: null
            });
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
        return (
            <div className="screen-unconfigured">
                <h1>Screen Unconfigured</h1>
                <p>Please go to <strong>Court Setup</strong> to assign this screen to a court.</p>
            </div>
        );
    }

    const isResting = phase === 'REST';
    const roundWins = { red: matchRoundWins.red || 0, blue: matchRoundWins.blue || 0 };
    const isFinal = isMatchFinal(roundWins, resolvedRules.roundsToWin);

    const renderPlayerName = (c) => {
        if (!c || !c.name) return <div className="name-only"> </div>;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', lineHeight: '1.2' }}>
                <div style={{ fontSize: '1em' }}>{c.name}</div>
                {c.affiliatedClub && <div style={{ fontSize: '0.45em', opacity: 0.85, marginTop: '2px' }}>({c.affiliatedClub})</div>}
            </div>
        );
    };

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

    const renderIvrBottomStatus = (remaining) => {
        if (isIvrUnlimited(remaining)) {
            return (
                <div className="screen-ivr-status" aria-label="IVR quota unlimited">
                    <Files className="screen-ivr-icon" aria-hidden />
                </div>
            );
        }

        const n = Math.max(0, remaining ?? 0);
        const Icon = n > 1 ? Files : n === 1 ? File : FileExcel;

        return (
            <div className="screen-ivr-status" aria-label={`IVR quota ${n}`}>
                <Icon className="screen-ivr-icon" aria-hidden />
            </div>
        );
    };

    const renderTimerContent = () => {
        if (winReason) return winReason;
        if (!isMatchLoaded) return "0:00";
        return formatTime(displayTime);
    };

    const renderSideHistory = (color) => {
        const scores = roundScores || {};
        return (
            <div className="round-history-container">
                {Object.entries(scores)
                    .sort(([a], [b]) => parseInt(a.substring(1)) - parseInt(b.substring(1)))
                    .map(([round, scoreData]) => (
                        <div className="history-row" key={round}>
                            <span className="history-label">{round}</span>
                            <span className="history-value">{scoreData[color] ?? 0}</span>
                        </div>
                    ))}
                <div className="total-round-wins">{roundWins[color]}</div>
            </div>
        );
    };

    const getTimeoutStyle = () => {
        const style = { backgroundColor: "#FFFF00", color: "#000000" };
        if (isMatchLoaded) {
            Object.assign(style, { backgroundColor: !isPaused ? "#000000" : "#FFFF00" });
            if (isPaused) {
                style.color = "#000000";
            } else if (!isResting) {
                style.color = "#000000";
            }
        }
        return style;
    };

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
                    <div className="red-name red-bg name-font">{renderPlayerName(config.competitors?.red)}</div>
                    <div className="blue-name blue-bg name-font">{renderPlayerName(config.competitors?.blue)}</div>
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
                        {isResting || isFinal ? renderSideHistory('red') : redTotalScore}
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
                                    <div className={`time-out match-font ${isMatchLoaded && !isPaused ? "timeout-active" : ""} ${isResting ? 'rest-mode' : ''}`} onClick={toggleTimer} style={getTimeoutStyle()}>
                                        {isResting ? 'REST TIME' : 'Time out'}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Blue Side: Score */}
                    <div className={'blue-score-text blue-score-bg score-font cursor-target'} style={{ color: blueScoreColor }} onClick={() => setShowEdit(true)}>
                        {isResting || isFinal ? renderSideHistory('blue') : blueTotalScore}
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
                        {renderIvrBottomStatus(redIvrRemaining)}
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
                        {renderIvrBottomStatus(blueIvrRemaining)}
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

            {/* Toast Notifications */}
            <div className="toast-container" style={{ position: 'fixed', top: '1.04cqi', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.52cqi', pointerEvents: 'none' }}>
                {toastMessages.map(toast => (
                    <div key={toast.id} style={{ backgroundColor: 'rgba(255, 60, 48, 0.95)', color: 'white', padding: '0.78cqi 1.56cqi', borderRadius: '0.62cqi', fontSize: '1.4cqi', fontWeight: 'bold', boxShadow: '0 0.42cqi 1.25cqi rgba(0,0,0,0.5)', textAlign: 'center', border: '2px solid rgba(255,255,255,0.2)' }}>
                        {toast.text}
                    </div>
                ))}
            </div>
        </>
    );
}

export default Screen;