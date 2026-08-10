import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../../firebase';
import { ref, get, update } from "firebase/database";
import { QrCode, PeopleFill, Trophy, PersonFill, CheckCircle, ArrowLeft, FileFill, RecordCircleFill, ShieldFill, PersonCircle, ArrowRepeat, FilePlayFill, FileFontFill, Stopwatch } from "react-bootstrap-icons";
import { usePopup } from "../../Context/PopupContext";
import "./Edit.css";
import Button from "../../Components/Button/Button";
import TechnicalCardConfirm from "../../Components/TechnicalCardFlow/TechnicalCardConfirm";
import IVRConfirm from "../../Components/IVRFlow/IVRConfirm";
import { updateScoreAndCheckRules, declareRoundWinner, startNextRound, promoteWinner, getEffectiveIvrRemaining, formatIvrQuotaForEdit, isIvrUnlimited, setIvrRemaining } from '../../Api';

const Edit = ({
    visible,
    setVisible,
    eventName,
    matchId,
    matchData,
    dominantSide,
    setShowQRCode,
    occupiedRefereesCount = 0,
    toggleDirection,
    toggleKyeShi,
    kyeShiActive,
    courtId,
    session,
    onTechCardConfirm,
    isTechnicalCardFlowActive = false,
    onIvrConfirm,
    isIvrFlowActive = false,
    eventSettings = {},
}) => {
    const { showToast } = usePopup();
    const [matchMin, setMatchMin] = useState(0);
    const [matchSec, setMatchSec] = useState(0);
    const [restMin, setRestMin] = useState(0);
    const [restSec, setRestSec] = useState(0);
    const [showSuperiorityVote, setShowSuperiorityVote] = useState(false);
    const [showAvoidingPopup, setShowAvoidingPopup] = useState(false);
    const [techCardConfirmSide, setTechCardConfirmSide] = useState(null);
    const [ivrConfirmSide, setIvrConfirmSide] = useState(null);
    const [ivrQuotaInputs, setIvrQuotaInputs] = useState({ blue: '', red: '' });
    const [ivrQuotaFocused, setIvrQuotaFocused] = useState(null);
    const [avoidingSide, setAvoidingSide] = useState(null);
    const [avoidingAction, setAvoidingAction] = useState(1);
    const navigate = useNavigate();

    const handleWinDeclaration = (winnerSide) => {
        if (!eventName || !matchId || !winnerSide) return;
        declareRoundWinner(eventName, matchId, winnerSide);
        setVisible(false);
        setShowSuperiorityVote(false);
    };

    const handleDeclareWinner = () => {
        if (dominantSide && dominantSide.trim() !== 'none') {
            handleWinDeclaration(dominantSide);
        } else {
            setShowSuperiorityVote(true);
        }
    };

    const handleAction = (side, type, index, delta) => {
        if (!matchData) return;

        const currentTimer = matchData.state?.timer || 0;

        // Handle adding penalty in last 10s
        if (type === 'gamjeom' && delta === 1 && currentTimer > 0 && currentTimer <= 10) {
            setAvoidingSide(side);
            setAvoidingAction(1);
            setShowAvoidingPopup(true);
            return;
        }

        // Handle removing penalty
        if (type === 'gamjeom' && delta === -1) {
            const sideStats = matchData.stats[side];
            if (sideStats && sideStats.gamjeomAvoiding && sideStats.gamjeomAvoiding > 0) {
                setAvoidingSide(side);
                setAvoidingAction(-1);
                setShowAvoidingPopup(true);
                return;
            }
        }

        updateScoreAndCheckRules(eventName, matchId, side, type, index, delta);
    };

    const handleAvoidingDecision = (penaltyValue) => {
        if (penaltyValue === 1) {
            updateScoreAndCheckRules(eventName, matchId, avoidingSide, 'gamjeom', null, avoidingAction);
        } else if (penaltyValue === 2) {
            updateScoreAndCheckRules(eventName, matchId, avoidingSide, 'gamjeomAvoiding', null, avoidingAction);
        }
        setShowAvoidingPopup(false);
        setAvoidingSide(null);
    };

    const matchRules = matchData?.config?.rules || {};
    const getSideIvrRemaining = (side) =>
        getEffectiveIvrRemaining(matchData?.stats, side, eventSettings, matchRules);

    useEffect(() => {
        if (!matchData) {
            setIvrQuotaInputs({ blue: '', red: '' });
            return;
        }
        setIvrQuotaInputs((prev) => ({
            blue: ivrQuotaFocused === 'blue'
                ? prev.blue
                : formatIvrQuotaForEdit(getEffectiveIvrRemaining(matchData.stats, 'blue', eventSettings, matchRules)),
            red: ivrQuotaFocused === 'red'
                ? prev.red
                : formatIvrQuotaForEdit(getEffectiveIvrRemaining(matchData.stats, 'red', eventSettings, matchRules)),
        }));
    }, [
        matchData,
        eventSettings,
        matchRules,
        ivrQuotaFocused,
        matchData?.stats?.blue?.ivrRemaining,
        matchData?.stats?.red?.ivrRemaining,
    ]);

    const ivrQuotaControlsDisabled = !matchData || isIvrFlowActive || ivrConfirmSide;

    const handleIvrQuotaInputChange = (side, value) => {
        if (!/^\d*$/.test(value)) return;
        setIvrQuotaInputs((prev) => ({ ...prev, [side]: value }));
    };

    const commitIvrQuota = (side, value) => {
        if (!eventName || !matchId) return;
        if (value === null || value === '') {
            setIvrRemaining(eventName, matchId, side, null);
            setIvrQuotaInputs((prev) => ({ ...prev, [side]: '' }));
            return;
        }
        const next = Math.max(0, Math.floor(Number(value) || 0));
        setIvrRemaining(eventName, matchId, side, next);
        setIvrQuotaInputs((prev) => ({ ...prev, [side]: String(next) }));
    };

    const handleIvrQuotaBlur = (side) => {
        setIvrQuotaFocused(null);
        const raw = ivrQuotaInputs[side];
        if (raw === '') {
            commitIvrQuota(side, null);
            return;
        }
        const parsed = parseInt(raw, 10);
        const next = Number.isNaN(parsed) ? getSideIvrRemaining(side) : parsed;
        commitIvrQuota(side, isIvrUnlimited(next) ? null : next);
    };

    const isIvrBlocked = () =>
        !matchData
        || showAvoidingPopup
        || isTechnicalCardFlowActive
        || isIvrFlowActive
        || techCardConfirmSide
        || ivrConfirmSide;

    const handleIVRAction = (side) => {
        const remaining = getSideIvrRemaining(side);
        if (isIvrBlocked() || (!isIvrUnlimited(remaining) && remaining <= 0)) return;
        setIvrConfirmSide(side);
    };

    const handleIvrAccept = () => {
        const side = ivrConfirmSide;
        setIvrConfirmSide(null);
        onIvrConfirm?.({ side, decision: "accept" });
    };

    const handleIvrReject = () => {
        const side = ivrConfirmSide;
        setIvrConfirmSide(null);
        onIvrConfirm?.({ side, decision: "reject" });
    };

    const handleIvrCancel = () => {
        setIvrConfirmSide(null);
    };

    const handleTechnicalCardAction = (side) => {
        if (!matchData || showAvoidingPopup || isTechnicalCardFlowActive || isIvrFlowActive || techCardConfirmSide || ivrConfirmSide) return;
        setTechCardConfirmSide(side);
    };

    const handleTechCardAccept = () => {
        const side = techCardConfirmSide;
        setTechCardConfirmSide(null);
        onTechCardConfirm?.({ side, decision: "accept" });
    };

    const handleTechCardReject = () => {
        const side = techCardConfirmSide;
        setTechCardConfirmSide(null);
        onTechCardConfirm?.({ side, decision: "reject" });
    };

    const handleTechCardCancel = () => {
        setTechCardConfirmSide(null);
    };

    useEffect(() => {
        if (!visible) {
            setShowSuperiorityVote(false);
            setShowAvoidingPopup(false);
            setAvoidingSide(null);
            setTechCardConfirmSide(null);
            setIvrConfirmSide(null);
            return;
        }

        const initialTimer = matchData?.state?.timer || 0;
        const currentMinutes = Math.floor(initialTimer / 60);
        const currentSeconds = Math.floor(initialTimer % 60);
        const activePhase = matchData?.state?.phase || 'ROUND';

        if (activePhase === 'ROUND') {
            setMatchMin(currentMinutes);
            setMatchSec(currentSeconds);
        } else if (activePhase === 'REST') {
            setRestMin(currentMinutes);
            setRestSec(currentSeconds);
        }

        if (eventName && matchId) {
            const configRef = ref(database, `events/${eventName}/matches/${matchId}/config`);
            get(configRef).then((snapshot) => {
                if (!snapshot.exists()) return;
                const config = snapshot.val();
                const defaultMatchSec = config.rules?.roundDuration || 90;
                const defaultRestSec = config.rules?.restDuration || 60;

                if (activePhase === 'ROUND') {
                    setRestMin(Math.floor(defaultRestSec / 60));
                    setRestSec(defaultRestSec % 60);
                } else if (activePhase === 'REST') {
                    setMatchMin(Math.floor(defaultMatchSec / 60));
                    setMatchSec(defaultMatchSec % 60);
                }
            });
        }
    }, [visible, eventName, matchId, matchData]);

    const handleTimeUpdate = (timeType, newMin, newSec) => {
        if (!eventName || !matchId) return;

        const totalSeconds = parseInt(newMin, 10) * 60 + parseInt(newSec, 10);
        const stateRef = ref(database, `events/${eventName}/matches/${matchId}/state`);

        const updates = {
            timer: totalSeconds,
            isPaused: true,
            lastStartTime: null,
            isFinished: totalSeconds === 0,
        };

        get(stateRef).then(snapshot => {
            if (snapshot.exists()) {
                const stateData = snapshot.val();
                const currentPhase = stateData.phase || 'ROUND';

                if (timeType === 'match' && currentPhase === 'ROUND') {
                    update(stateRef, updates);
                } else if (timeType === 'rest' && currentPhase === 'REST') {
                    update(stateRef, updates);
                }
            }
        });
    };

    const handleMatchMinChange = (value) => {
        setMatchMin(value);
        handleTimeUpdate('match', value, matchSec);
    };

    const handleMatchSecChange = (value) => {
        setMatchSec(value);
        handleTimeUpdate('match', matchMin, value);
    };

    const handleRestMinChange = (value) => {
        setRestMin(value);
        handleTimeUpdate('rest', value, restSec);
    };

    const handleRestSecChange = (value) => {
        setRestSec(value);
        handleTimeUpdate('rest', restMin, value);
    };

    const buttonFontSize = '2cqi';
    const PunchIconComp = ({ size, style }) => (
        <span className="punch-icon" style={{ ...style, width: size, height: size }} />
    );
    const TrunkIconComp = ({ size, style }) => (
        <span className="trunk-icon" style={{ ...style, width: size, height: size }} />
    );
    const HelmetIconComp = ({ size, style }) => (
        <span className="helmet-icon" style={{ ...style, width: size, height: size }} />
    );
    const pointTypes = [
        { name: "Gam-jeom", type: "gamjeom", index: null, icon: FileFill },
        { name: "Punch", type: "pointsStat", index: 0, icon: PunchIconComp, iconSize: "1.8cqi" },
        { name: "Body", type: "pointsStat", index: 1, icon: TrunkIconComp, iconSize: "1.5cqi" },
        { name: "Head", type: "pointsStat", index: 2, icon: HelmetIconComp, iconSize: "1.5cqi" },
        { name: "Body(Turn)", type: "pointsStat", index: 3, icon: ArrowRepeat, secondIcon: TrunkIconComp, iconSize: "1.5cqi" },
        { name: "Head(Turn)", type: "pointsStat", index: 4, icon: ArrowRepeat, secondIcon: HelmetIconComp, iconSize: "1.5cqi" }
    ];

    const { config = {}, state = {}, stats = {} } = matchData || {};
    const { phase, isFinished, winReason } = state || {};
    const { roundWins } = stats || {};
    const { rules = {} } = config;

    const roundsToWin = rules.roundsToWin || 2;

    const getFinalWinner = () => {
        const redWins = roundWins?.red || 0;
        const blueWins = roundWins?.blue || 0;
        if (redWins >= roundsToWin) return 'red';
        if (blueWins >= roundsToWin) return 'blue';
        return null;
    };

    const finalWinner = getFinalWinner();

    const showDeclareWinnerButton = (phase === 'ROUND' && (isFinished || winReason)) && !finalWinner && !showSuperiorityVote;
    const showPromoteWinnerButton = isFinished && finalWinner;

    const handlePromoteWinner = async () => {
        try {
            const message = await promoteWinner(eventName, matchId, finalWinner);
            if (message) showToast(message);
        } catch (e) {
            showToast(`晉級失敗: ${e.message}`);
        }
    };

    const ivrButtonDisabled = (side) => {
        const remaining = getSideIvrRemaining(side);
        return isIvrBlocked() || (!isIvrUnlimited(remaining) && remaining <= 0);
    };
    const techCardButtonDisabled = !matchData || showAvoidingPopup || isTechnicalCardFlowActive || isIvrFlowActive || techCardConfirmSide || ivrConfirmSide;

    const renderIvrQuotaInput = (side) => (
        <input
            type="text"
            inputMode="numeric"
            className="edit-ivr-quota-input"
            value={ivrQuotaInputs[side]}
            onChange={(e) => handleIvrQuotaInputChange(side, e.target.value)}
            onFocus={() => setIvrQuotaFocused(side)}
            onBlur={() => handleIvrQuotaBlur(side)}
            disabled={ivrQuotaControlsDisabled}
            aria-label={`${side} IVR quota`}
        />
    );

    return (
        <div className={`edit-bar ${visible ? 'visible' : ''}`}>
            <div className="edit-grid">
                {/* Header Row */}
                <div className="grid-cell header"></div>

                {/* IVR 標題 - 水平排列對齊 */}
                <div className="grid-cell header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FilePlayFill size="1.3cqi" color="white" style={{ marginRight: '0.4cqi' }} />
                    <span style={{ whiteSpace: 'nowrap' }}>IVR</span>
                </div>
                {/* Technical Card 標題 - 水平排列對齊 */}
                <div className="grid-cell header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileFontFill size="1.3cqi" color="white" style={{ marginRight: '0.4cqi' }} />
                    <span style={{ whiteSpace: 'nowrap' }}>Technical</span>
                </div>

                {pointTypes.map(pt => (
                    <div className="grid-cell header" key={pt.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {pt.icon && <pt.icon size={pt.iconSize || "1.3cqi"} style={{ marginRight: pt.secondIcon ? '0.1cqi' : '0.4cqi', color: 'white' }} />}
                        {pt.secondIcon && <pt.secondIcon size={pt.iconSize || "1.3cqi"} style={{ marginRight: '0.4cqi', color: 'white' }} />}
                        <span style={{ whiteSpace: 'nowrap' }}>{pt.name}</span>
                    </div>
                ))}

                {/* Blue Row */}
                <div className="grid-cell side-label blue">Blue</div>

                {/* Blue IVR 按鈕 + 剩餘 quota */}
                <div className="grid-cell">
                    <div className="buttons">
                        <Button
                            icon={<FilePlayFill color="white" size="2cqi" />}
                            fontSize={buttonFontSize}
                            onClick={() => handleIVRAction('blue')}
                            style={{ padding: '0.1cqi 1.2cqi', opacity: ivrButtonDisabled('blue') ? 0.3 : 1 }}
                            angle={220}
                            disabled={ivrButtonDisabled('blue')}
                        />
                        {renderIvrQuotaInput('blue')}
                    </div>
                </div>
                {/* Blue Technical Card 按鈕 - 完全對齊加減制 */}
                <div className="grid-cell">
                    <div className="buttons">
                        <Button
                            icon={<FileFontFill color="white" size="2cqi" />}
                            fontSize={buttonFontSize}
                            onClick={() => handleTechnicalCardAction('blue')}
                            style={{ padding: '0.1cqi 1.2cqi', opacity: techCardButtonDisabled ? 0.3 : 1 }}
                            angle={220}
                            disabled={techCardButtonDisabled}
                        />
                    </div>
                </div>

                {pointTypes.map(pt => (
                    <div className="grid-cell" key={`blue-${pt.name}`}>
                        <div className="buttons">
                            <Button text="+" fontSize={buttonFontSize} style={{ padding: '0.1cqi 1.2cqi', opacity: !matchData ? 0.3 : 1 }} onClick={() => handleAction('blue', pt.type, pt.index, 1)} angle={220} disabled={!matchData} />
                            <Button text="−" fontSize={buttonFontSize} style={{ padding: '0.1cqi 1.2cqi', opacity: !matchData ? 0.3 : 1 }} onClick={() => handleAction('blue', pt.type, pt.index, -1)} angle={220} disabled={!matchData} />
                        </div>
                    </div>
                ))}

                {/* Red Row */}
                <div className="grid-cell side-label red">Red</div>

                {/* Red IVR 按鈕 + 剩餘 quota */}
                <div className="grid-cell">
                    <div className="buttons">
                        <Button
                            icon={<FilePlayFill color="white" size="2cqi" />}
                            fontSize={buttonFontSize}
                            onClick={() => handleIVRAction('red')}
                            style={{ padding: '0.1cqi 1.2cqi', opacity: ivrButtonDisabled('red') ? 0.3 : 1 }}
                            angle={0}
                            disabled={ivrButtonDisabled('red')}
                        />
                        {renderIvrQuotaInput('red')}
                    </div>
                </div>
                {/* Red Technical Card 按鈕 - 完全對齊加減制 */}
                <div className="grid-cell">
                    <div className="buttons">
                        <Button
                            icon={<FileFontFill color="white" size="2cqi" />}
                            fontSize={buttonFontSize}
                            onClick={() => handleTechnicalCardAction('red')}
                            style={{ padding: '0.1cqi 1.2cqi', opacity: techCardButtonDisabled ? 0.3 : 1 }}
                            angle={0}
                            disabled={techCardButtonDisabled}
                        />
                    </div>
                </div>

                {pointTypes.map(pt => (
                    <div className="grid-cell" key={`red-${pt.name}`}>
                        <div className="buttons">
                            <Button text="+" fontSize={buttonFontSize} style={{ padding: '0.1cqi 1.2cqi', opacity: !matchData ? 0.3 : 1 }} onClick={() => handleAction('red', pt.type, pt.index, 1)} angle={0} disabled={!matchData} />
                            <Button text="−" fontSize={buttonFontSize} style={{ padding: '0.1cqi 1.2cqi', opacity: !matchData ? 0.3 : 1 }} onClick={() => handleAction('red', pt.type, pt.index, -1)} angle={0} disabled={!matchData} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="time-bar">
                <Button
                    onClick={() => navigate(-1)}
                    text="Back (返回)"
                    icon={<ArrowLeft size="1.2cqi" />}
                    fontSize="1.4cqi"
                    angle={180}
                    variant="gray"
                    style={{ marginRight: '0.5cqi' }}
                />
                {toggleDirection && (
                    <Button
                        text="Swap (⇄)"
                        fontSize="1.4cqi"
                        onClick={toggleDirection}
                        gradient={['#ef4444', '#ef4444', '#ef4444', '#3b82f6', '#3b82f6', '#3b82f6']}
                        style={{ marginRight: '1cqi' }}
                    />
                )}
                {toggleKyeShi && (
                    <Button
                        text={kyeShiActive ? "Stop Kye-shi" : "Kye-shi"}
                        icon={<Stopwatch size="1.4cqi" />}
                        fontSize="1.4cqi"
                        onClick={toggleKyeShi}
                        style={{
                            marginRight: '1cqi',
                            color: kyeShiActive ? '#ef4444' : '#FFFF00',
                            '--button-gradient': kyeShiActive ? '#ef4444' : '#FFFF00'
                        }}
                    />
                )}
                <div className='time-control-group'>
                    <h2>Match Time</h2>
                    <div className="time-selects">
                        <select value={matchMin} onChange={(e) => handleMatchMinChange(e.target.value)} disabled={!matchData}>
                            {[0, 1, 2].map(min => <option key={min} value={min}>{min}</option>)}
                        </select> min
                        <select value={matchSec} onChange={(e) => handleMatchSecChange(e.target.value)} disabled={!matchData}>
                            {Array.from({ length: 60 }, (_, i) => i).map(sec => <option key={sec} value={sec}>{sec}</option>)}
                        </select> sec
                    </div>
                </div>

                {setShowQRCode && (
                    <Button
                        text={`QR Code (${occupiedRefereesCount}/3)`}
                        fontSize="1.4cqi"
                        icon={<QrCode size="1.4cqi" />}
                        onClick={() => {
                            setVisible(false);
                            setShowQRCode(true);
                        }}
                        style={{ '--button-gradient': '#38bdf8' }}
                    />
                )}

                {showPromoteWinnerButton && (
                    <Button
                        onClick={handlePromoteWinner}
                        text="Promote Winner"
                        fontSize="1.4cqi"
                        angle={50}
                    />
                )}

                {showDeclareWinnerButton && (
                    <Button text="Winner (判定勝負)" fontSize="1.4cqi" onClick={handleDeclareWinner} angle={50} icon={<Trophy size="1.4cqi" />} />
                )}

                {showSuperiorityVote && (
                    <div className="superiority-vote time-control-group">
                        <h2>Woo-se-girok</h2>
                        <div className="buttons">
                            <Button text="Blue" fontSize="1.4cqi" onClick={() => handleWinDeclaration('blue')} angle={220} icon={<PersonFill size="1.4cqi" />} />
                            <Button text="Red" fontSize="1.4cqi" onClick={() => handleWinDeclaration('red')} angle={0} icon={<PersonFill size="1.4cqi" />} />
                        </div>
                    </div>
                )}

                <Button text="Done (完成)" fontSize="1.4cqi" onClick={() => setVisible(false)} icon={<CheckCircle size="1.4cqi" />} />
            </div>

            {techCardConfirmSide && (
                <TechnicalCardConfirm
                    side={techCardConfirmSide}
                    onAccept={handleTechCardAccept}
                    onReject={handleTechCardReject}
                    onCancel={handleTechCardCancel}
                />
            )}

            {ivrConfirmSide && (
                <IVRConfirm
                    side={ivrConfirmSide}
                    onAccept={handleIvrAccept}
                    onReject={handleIvrReject}
                    onCancel={handleIvrCancel}
                />
            )}

            {showAvoidingPopup && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 2000,
                    backdropFilter: 'blur(5px)'
                }}>
                    <div className="glass-panel" style={{
                        padding: '3cqi 4cqi',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2cqi',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '2cqi',
                        background: 'rgba(30, 30, 40, 0.85)'
                    }}>
                        <h2 style={{ margin: 0, fontSize: '2.2cqi', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                            {avoidingAction === 1 ? "Penalty in last 10s" : "Remove Penalty"}
                        </h2>
                        <div style={{ display: 'flex', gap: '2cqi', marginTop: '1cqi' }}>
                            <Button text={avoidingAction === 1 ? "1-Jeom" : "-1 Jeom"} fontSize="1.6cqi" onClick={() => handleAvoidingDecision(1)} angle={avoidingSide === 'blue' ? 220 : 0} style={{ padding: '1cqi 2cqi' }} />
                            <Button text={avoidingAction === 1 ? "2-Jeom" : "-2 Jeom"} fontSize="1.6cqi" onClick={() => handleAvoidingDecision(2)} angle={avoidingSide === 'blue' ? 220 : 0} style={{ padding: '1cqi 2cqi' }} />
                        </div>
                        <Button text="Cancel" fontSize="1.2cqi" variant="cancel" onClick={() => setShowAvoidingPopup(false)} style={{ marginTop: '1cqi', padding: '0.5cqi 2cqi' }} />
                    </div>
                </div>
            )}
        </div>
    );
}

export default Edit;