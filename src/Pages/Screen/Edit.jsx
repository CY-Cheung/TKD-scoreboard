import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../../firebase';
import { QrCode, Trophy, PersonFill, CheckCircle, ArrowLeft, FilePlayFill, FileFontFill, Stopwatch } from "react-bootstrap-icons";
import { usePopup } from "../../Context/PopupContext";
import "./Edit.css";
import Button from "../../Components/Button/Button";
import TechnicalCardConfirm from "../../Components/TechnicalCardFlow/TechnicalCardConfirm";
import IVRConfirm from "../../Components/IVRFlow/IVRConfirm";
import { updateScoreAndCheckRules, declareRoundWinner, promoteWinner, getEffectiveIvrRemaining, formatIvrQuotaForEdit, isIvrUnlimited, setIvrRemaining } from '../../Api';
import { updateMatchLiveState } from '../../services/matchFirebase';
import { StableLocaleText, useAlternatingLocale } from '../../Components/AlternatingLocale/AlternatingLocale';
import { getFinalWinnerSide, resolveMatchRules } from '../../domain/matchRules.js';
import EditGridLocale from './EditGridLocale';
import { EDIT_POINT_TYPES } from './editPointTypes';
import EditSideScoreRow from './EditSideScoreRow';
import AvoidingPenaltyPopup from './AvoidingPenaltyPopup';

const EMPTY_MATCH_RULES = Object.freeze({});

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
    const { locale, visible: localeVisible } = useAlternatingLocale();
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

    const matchRules = matchData?.config?.rules || EMPTY_MATCH_RULES;
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
        matchData?.config?.rules,
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
            // Prefer in-memory / flat config from matchData (Stage 5+).
            const config = matchData?.config;
            if (config) {
                const defaultMatchSec = config.rules?.roundDuration || 90;
                const defaultRestSec = config.rules?.restDuration || 60;
                if (activePhase === 'ROUND') {
                    setRestMin(Math.floor(defaultRestSec / 60));
                    setRestSec(defaultRestSec % 60);
                } else if (activePhase === 'REST') {
                    setMatchMin(Math.floor(defaultMatchSec / 60));
                    setMatchSec(defaultMatchSec % 60);
                }
            }
        }
    }, [visible, eventName, matchId, matchData]);

    const handleTimeUpdate = (timeType, newMin, newSec) => {
        if (!eventName || !matchId) return;

        const totalSeconds = parseInt(newMin, 10) * 60 + parseInt(newSec, 10);
        const updates = {
            timer: totalSeconds,
            isPaused: true,
            lastStartTime: null,
            isFinished: totalSeconds === 0,
        };

        const currentPhase = matchData?.state?.phase || 'ROUND';
        if (timeType === 'match' && currentPhase === 'ROUND') {
            updateMatchLiveState(database, eventName, matchId, updates);
        } else if (timeType === 'rest' && currentPhase === 'REST') {
            updateMatchLiveState(database, eventName, matchId, updates);
        }
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

    const { config = {}, state = {}, stats = {} } = matchData || {};
    const { phase, isFinished, winReason } = state || {};
    const { roundWins } = stats || {};
    const { rules = {} } = config;

    const { roundsToWin } = resolveMatchRules(rules);
    const finalWinner = getFinalWinnerSide(roundWins, roundsToWin);

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
                <div className="grid-cell header">
                    <FilePlayFill size="1.3cqi" color="white" style={{ marginRight: '0.4cqi', flexShrink: 0 }} />
                    <EditGridLocale locale={locale} visible={localeVisible} en="IVR" zh="IVR" />
                </div>
                {/* Technical Card 標題 - 水平排列對齊 */}
                <div className="grid-cell header">
                    <FileFontFill size="1.3cqi" color="white" style={{ marginRight: '0.4cqi', flexShrink: 0 }} />
                    <EditGridLocale locale={locale} visible={localeVisible} en="Technical" zh="技術卡" />
                </div>

                {EDIT_POINT_TYPES.map(pt => (
                    <div className="grid-cell header" key={pt.id}>
                        {pt.icon && <pt.icon size={pt.iconSize || "1.3cqi"} style={{ marginRight: pt.secondIcon ? '0.1cqi' : '0.4cqi', color: 'white', flexShrink: 0 }} />}
                        {pt.secondIcon && <pt.secondIcon size={pt.iconSize || "1.3cqi"} style={{ marginRight: '0.4cqi', color: 'white', flexShrink: 0 }} />}
                        <EditGridLocale locale={locale} visible={localeVisible} en={pt.nameEn} zh={pt.nameZh} />
                    </div>
                ))}

                <EditSideScoreRow
                    side="blue"
                    angle={220}
                    labelEn="Blue"
                    labelZh="藍"
                    locale={locale}
                    localeVisible={localeVisible}
                    buttonFontSize={buttonFontSize}
                    matchData={matchData}
                    onIvr={handleIVRAction}
                    onTechCard={handleTechnicalCardAction}
                    ivrDisabled={ivrButtonDisabled('blue')}
                    techCardDisabled={techCardButtonDisabled}
                    ivrQuotaInput={renderIvrQuotaInput('blue')}
                    onScoreAction={handleAction}
                />

                <EditSideScoreRow
                    side="red"
                    angle={0}
                    labelEn="Red"
                    labelZh="紅"
                    locale={locale}
                    localeVisible={localeVisible}
                    buttonFontSize={buttonFontSize}
                    matchData={matchData}
                    onIvr={handleIVRAction}
                    onTechCard={handleTechnicalCardAction}
                    ivrDisabled={ivrButtonDisabled('red')}
                    techCardDisabled={techCardButtonDisabled}
                    ivrQuotaInput={renderIvrQuotaInput('red')}
                    onScoreAction={handleAction}
                />
            </div>

            <div className="time-bar">
                <Button
                    onClick={() => navigate(-1)}
                    icon={<ArrowLeft size="1.2cqi" />}
                    fontSize="1.4cqi"
                    angle={180}
                    variant="gray"
                    style={{ marginRight: '0.5cqi' }}
                >
                    <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Back" zh="返回" />
                </Button>
                {toggleDirection && (
                    <Button
                        fontSize="1.4cqi"
                        onClick={toggleDirection}
                        gradient={['#ef4444', '#ef4444', '#ef4444', '#3b82f6', '#3b82f6', '#3b82f6']}
                        style={{ marginRight: '1cqi' }}
                    >
                        <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Swap (⇄)" zh="對調 (⇄)" />
                    </Button>
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
                    <StableLocaleText as="h2" locale={locale} visible={localeVisible} en="Match Time" zh="比賽時間" />
                    <div className="time-selects">
                        <select value={matchMin} onChange={(e) => handleMatchMinChange(e.target.value)} disabled={!matchData}>
                            {[0, 1, 2].map(min => <option key={min} value={min}>{min}</option>)}
                        </select>
                        <StableLocaleText as="span" locale={locale} visible={localeVisible} className="edit-locale-label" en="min" zh="分" />
                        <select value={matchSec} onChange={(e) => handleMatchSecChange(e.target.value)} disabled={!matchData}>
                            {Array.from({ length: 60 }, (_, i) => i).map(sec => <option key={sec} value={sec}>{sec}</option>)}
                        </select>
                        <StableLocaleText as="span" locale={locale} visible={localeVisible} className="edit-locale-label" en="sec" zh="秒" />
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
                        fontSize="1.4cqi"
                        angle={50}
                    >
                        <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Promote Winner" zh="晉級優勝者" />
                    </Button>
                )}

                {showDeclareWinnerButton && (
                    <Button fontSize="1.4cqi" onClick={handleDeclareWinner} angle={50} icon={<Trophy size="1.4cqi" />}>
                        <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Winner" zh="判定勝負" />
                    </Button>
                )}

                {showSuperiorityVote && (
                    <div className="superiority-vote time-control-group">
                        <StableLocaleText as="h2" locale={locale} visible={localeVisible} en="Woo-se-girok" zh="優勢判定" />
                        <div className="buttons">
                            <Button fontSize="1.4cqi" onClick={() => handleWinDeclaration('blue')} angle={220} icon={<PersonFill size="1.4cqi" />}>
                                <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Blue" zh="藍" />
                            </Button>
                            <Button fontSize="1.4cqi" onClick={() => handleWinDeclaration('red')} angle={0} icon={<PersonFill size="1.4cqi" />}>
                                <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Red" zh="紅" />
                            </Button>
                        </div>
                    </div>
                )}

                <Button fontSize="1.4cqi" onClick={() => setVisible(false)} icon={<CheckCircle size="1.4cqi" />}>
                    <StableLocaleText as="span" locale={locale} visible={localeVisible} en="Done" zh="完成" />
                </Button>
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
                <AvoidingPenaltyPopup
                    locale={locale}
                    localeVisible={localeVisible}
                    avoidingSide={avoidingSide}
                    avoidingAction={avoidingAction}
                    onDecision={handleAvoidingDecision}
                    onCancel={() => setShowAvoidingPopup(false)}
                />
            )}
        </div>
    );
}

export default Edit;