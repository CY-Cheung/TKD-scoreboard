import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../../firebase';
import { usePopup } from "../../Context/PopupContext";
import "./Edit.css";
import TechnicalCardConfirm from "../../Components/TechnicalCardFlow/TechnicalCardConfirm";
import IVRConfirm from "../../Components/IVRFlow/IVRConfirm";
import {
    updateScoreAndCheckRules,
    declareRoundWinner,
    promoteWinner,
    getEffectiveIvrRemaining,
    formatIvrQuotaForEdit,
    setIvrRemaining,
} from '../../Api';
import { updateMatchLiveState } from '../../services/matchFirebase';
import { useAlternatingLocale } from '../../Components/AlternatingLocale/AlternatingLocale';
import { getFinalWinnerSide, resolveMatchRules } from '../../domain/matchRules.js';
import EditSideScoreRow from './EditSideScoreRow';
import AvoidingPenaltyPopup from './AvoidingPenaltyPopup';
import EditGridHeaders from './EditGridHeaders';
import EditIvrQuotaInput from './EditIvrQuotaInput';
import EditTimeBar from './EditTimeBar';
import {
    resolveScorePadClick,
    scoreTypeForAvoidingDecision,
} from './editScoreActions';
import {
    isIvrActionBlocked,
    isTechCardActionBlocked,
    isValidIvrQuotaTyping,
    resolveIvrQuotaCommitValue,
    isIvrButtonDisabled,
} from './editIvrGates';
import {
    minSecToSeconds,
    buildMatchLiveTimerPatch,
    shouldApplyTimeUpdate,
    buildEditTimerFieldState,
} from './editTimerFields';
import { resolveEditWinnerUi } from './editWinnerUi';

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

        const decision = resolveScorePadClick({
            type,
            delta,
            currentTimer: matchData.state?.timer || 0,
            sideStats: matchData.stats?.[side],
        });

        if (decision.kind === 'avoiding_popup') {
            setAvoidingSide(side);
            setAvoidingAction(decision.action);
            setShowAvoidingPopup(true);
            return;
        }

        updateScoreAndCheckRules(eventName, matchId, side, type, index, delta);
    };

    const handleAvoidingDecision = (penaltyValue) => {
        const scoreType = scoreTypeForAvoidingDecision(penaltyValue);
        if (scoreType) {
            updateScoreAndCheckRules(eventName, matchId, avoidingSide, scoreType, null, avoidingAction);
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
        if (!isValidIvrQuotaTyping(value)) return;
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
        const next = resolveIvrQuotaCommitValue(
            ivrQuotaInputs[side],
            getSideIvrRemaining(side)
        );
        commitIvrQuota(side, next);
    };

    const flowGate = {
        matchData,
        showAvoidingPopup,
        isTechnicalCardFlowActive,
        isIvrFlowActive,
        techCardConfirmSide,
        ivrConfirmSide,
    };

    const handleIVRAction = (side) => {
        const remaining = getSideIvrRemaining(side);
        if (isIvrButtonDisabled(isIvrActionBlocked(flowGate), remaining)) return;
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
        if (isTechCardActionBlocked(flowGate)) return;
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

        const fields = buildEditTimerFieldState(matchData);
        if (!fields) return;
        setMatchMin(fields.matchMin);
        setMatchSec(fields.matchSec);
        setRestMin(fields.restMin);
        setRestSec(fields.restSec);
    }, [visible, eventName, matchId, matchData]);

    const handleTimeUpdate = (timeType, newMin, newSec) => {
        if (!eventName || !matchId) return;
        const totalSeconds = minSecToSeconds(newMin, newSec);
        const updates = buildMatchLiveTimerPatch(totalSeconds);
        const currentPhase = matchData?.state?.phase || 'ROUND';
        if (shouldApplyTimeUpdate(timeType, currentPhase)) {
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
    const { showDeclareWinnerButton, showPromoteWinnerButton } = resolveEditWinnerUi({
        phase,
        isFinished,
        winReason,
        finalWinner,
        showSuperiorityVote,
    });

    const handlePromoteWinner = async () => {
        try {
            const message = await promoteWinner(eventName, matchId, finalWinner);
            if (message) showToast(message);
        } catch (e) {
            showToast(`晉級失敗: ${e.message}`);
        }
    };

    const techCardButtonDisabled = isTechCardActionBlocked(flowGate);

    return (
        <div className={`edit-bar ${visible ? 'visible' : ''}`}>
            <div className="edit-grid">
                <EditGridHeaders locale={locale} localeVisible={localeVisible} />

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
                    ivrDisabled={isIvrButtonDisabled(isIvrActionBlocked(flowGate), getSideIvrRemaining('blue'))}
                    techCardDisabled={techCardButtonDisabled}
                    ivrQuotaInput={
                        <EditIvrQuotaInput
                            side="blue"
                            value={ivrQuotaInputs.blue}
                            disabled={ivrQuotaControlsDisabled}
                            onChange={handleIvrQuotaInputChange}
                            onFocus={setIvrQuotaFocused}
                            onBlur={handleIvrQuotaBlur}
                        />
                    }
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
                    ivrDisabled={isIvrButtonDisabled(isIvrActionBlocked(flowGate), getSideIvrRemaining('red'))}
                    techCardDisabled={techCardButtonDisabled}
                    ivrQuotaInput={
                        <EditIvrQuotaInput
                            side="red"
                            value={ivrQuotaInputs.red}
                            disabled={ivrQuotaControlsDisabled}
                            onChange={handleIvrQuotaInputChange}
                            onFocus={setIvrQuotaFocused}
                            onBlur={handleIvrQuotaBlur}
                        />
                    }
                    onScoreAction={handleAction}
                />
            </div>

            <EditTimeBar
                locale={locale}
                localeVisible={localeVisible}
                matchData={matchData}
                phase={phase}
                matchMin={matchMin}
                matchSec={matchSec}
                restMin={restMin}
                restSec={restSec}
                onMatchMinChange={handleMatchMinChange}
                onMatchSecChange={handleMatchSecChange}
                onRestMinChange={handleRestMinChange}
                onRestSecChange={handleRestSecChange}
                onBack={() => navigate(-1)}
                toggleDirection={toggleDirection}
                toggleKyeShi={toggleKyeShi}
                kyeShiActive={kyeShiActive}
                setShowQRCode={setShowQRCode}
                occupiedRefereesCount={occupiedRefereesCount}
                onOpenQr={() => {
                    setVisible(false);
                    setShowQRCode(true);
                }}
                showPromoteWinnerButton={showPromoteWinnerButton}
                onPromoteWinner={handlePromoteWinner}
                showDeclareWinnerButton={showDeclareWinnerButton}
                onDeclareWinner={handleDeclareWinner}
                showSuperiorityVote={showSuperiorityVote}
                onWinDeclaration={handleWinDeclaration}
                onDone={() => setVisible(false)}
            />

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
