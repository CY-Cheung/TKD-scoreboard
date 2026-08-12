import React from "react";
import {
  QrCode,
  Trophy,
  PersonFill,
  CheckCircle,
  ArrowLeft,
  Stopwatch,
} from "react-bootstrap-icons";
import Button from "../../Components/Button/Button";
import { StableLocaleText } from "../../Components/AlternatingLocale/AlternatingLocale";

/** Bottom time / action bar for Edit panel. */
export default function EditTimeBar({
  locale,
  localeVisible,
  matchData,
  matchMin,
  matchSec,
  onMatchMinChange,
  onMatchSecChange,
  onBack,
  toggleDirection,
  toggleKyeShi,
  kyeShiActive,
  setShowQRCode,
  occupiedRefereesCount,
  onOpenQr,
  showPromoteWinnerButton,
  onPromoteWinner,
  showDeclareWinnerButton,
  onDeclareWinner,
  showSuperiorityVote,
  onWinDeclaration,
  onDone,
}) {
  return (
    <div className="time-bar">
      <Button
        onClick={onBack}
        icon={<ArrowLeft size="1.2cqi" />}
        fontSize="1.4cqi"
        angle={180}
        variant="gray"
        style={{ marginRight: "0.5cqi" }}
      >
        <StableLocaleText
          as="span"
          locale={locale}
          visible={localeVisible}
          en="Back"
          zh="返回"
        />
      </Button>
      {toggleDirection && (
        <Button
          fontSize="1.4cqi"
          onClick={toggleDirection}
          gradient={[
            "#ef4444",
            "#ef4444",
            "#ef4444",
            "#3b82f6",
            "#3b82f6",
            "#3b82f6",
          ]}
          style={{ marginRight: "1cqi" }}
        >
          <StableLocaleText
            as="span"
            locale={locale}
            visible={localeVisible}
            en="Swap (⇄)"
            zh="對調 (⇄)"
          />
        </Button>
      )}
      {toggleKyeShi && (
        <Button
          text={kyeShiActive ? "Stop Kye-shi" : "Kye-shi"}
          icon={<Stopwatch size="1.4cqi" />}
          fontSize="1.4cqi"
          onClick={toggleKyeShi}
          style={{
            marginRight: "1cqi",
            color: kyeShiActive ? "#ef4444" : "#FFFF00",
            "--button-gradient": kyeShiActive ? "#ef4444" : "#FFFF00",
          }}
        />
      )}
      <div className="time-control-group">
        <StableLocaleText
          as="h2"
          locale={locale}
          visible={localeVisible}
          en="Match Time"
          zh="比賽時間"
        />
        <div className="time-selects">
          <select
            value={matchMin}
            onChange={(e) => onMatchMinChange(e.target.value)}
            disabled={!matchData}
          >
            {[0, 1, 2].map((min) => (
              <option key={min} value={min}>
                {min}
              </option>
            ))}
          </select>
          <StableLocaleText
            as="span"
            locale={locale}
            visible={localeVisible}
            className="edit-locale-label"
            en="min"
            zh="分"
          />
          <select
            value={matchSec}
            onChange={(e) => onMatchSecChange(e.target.value)}
            disabled={!matchData}
          >
            {Array.from({ length: 60 }, (_, i) => i).map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
          <StableLocaleText
            as="span"
            locale={locale}
            visible={localeVisible}
            className="edit-locale-label"
            en="sec"
            zh="秒"
          />
        </div>
      </div>

      {setShowQRCode && (
        <Button
          text={`QR Code (${occupiedRefereesCount}/3)`}
          fontSize="1.4cqi"
          icon={<QrCode size="1.4cqi" />}
          onClick={onOpenQr}
          style={{ "--button-gradient": "#38bdf8" }}
        />
      )}

      {showPromoteWinnerButton && (
        <Button onClick={onPromoteWinner} fontSize="1.4cqi" angle={50}>
          <StableLocaleText
            as="span"
            locale={locale}
            visible={localeVisible}
            en="Promote Winner"
            zh="晉級優勝者"
          />
        </Button>
      )}

      {showDeclareWinnerButton && (
        <Button
          fontSize="1.4cqi"
          onClick={onDeclareWinner}
          angle={50}
          icon={<Trophy size="1.4cqi" />}
        >
          <StableLocaleText
            as="span"
            locale={locale}
            visible={localeVisible}
            en="Winner"
            zh="判定勝負"
          />
        </Button>
      )}

      {showSuperiorityVote && (
        <div className="superiority-vote time-control-group">
          <StableLocaleText
            as="h2"
            locale={locale}
            visible={localeVisible}
            en="Woo-se-girok"
            zh="優勢判定"
          />
          <div className="buttons">
            <Button
              fontSize="1.4cqi"
              onClick={() => onWinDeclaration("blue")}
              angle={220}
              icon={<PersonFill size="1.4cqi" />}
            >
              <StableLocaleText
                as="span"
                locale={locale}
                visible={localeVisible}
                en="Blue"
                zh="藍"
              />
            </Button>
            <Button
              fontSize="1.4cqi"
              onClick={() => onWinDeclaration("red")}
              angle={0}
              icon={<PersonFill size="1.4cqi" />}
            >
              <StableLocaleText
                as="span"
                locale={locale}
                visible={localeVisible}
                en="Red"
                zh="紅"
              />
            </Button>
          </div>
        </div>
      )}

      <Button
        fontSize="1.4cqi"
        onClick={onDone}
        icon={<CheckCircle size="1.4cqi" />}
      >
        <StableLocaleText
          as="span"
          locale={locale}
          visible={localeVisible}
          en="Done"
          zh="完成"
        />
      </Button>
    </div>
  );
}
