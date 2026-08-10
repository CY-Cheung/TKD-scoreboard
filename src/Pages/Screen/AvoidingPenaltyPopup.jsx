import React from "react";
import Button from "../../Components/Button/Button";
import { StableLocaleText } from "../../Components/AlternatingLocale/AlternatingLocale";

/**
 * Last-10s / remove-avoiding penalty chooser (1-jeom vs 2-jeom avoiding).
 */
function AvoidingPenaltyPopup({
  locale,
  localeVisible,
  avoidingSide,
  avoidingAction,
  onDecision,
  onCancel,
}) {
  const angle = avoidingSide === "blue" ? 220 : 0;
  const isAdd = avoidingAction === 1;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2000,
        backdropFilter: "blur(5px)",
      }}
    >
      <div
        className="glass-panel"
        style={{
          padding: "3cqi 4cqi",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2cqi",
          border: "2px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "2cqi",
          background: "rgba(30, 30, 40, 0.85)",
        }}
      >
        <StableLocaleText
          as="h2"
          locale={locale}
          visible={localeVisible}
          style={{
            margin: 0,
            fontSize: "2.2cqi",
            color: "white",
            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
          }}
          en={isAdd ? "Penalty in last 10s" : "Remove Penalty"}
          zh={isAdd ? "最後 10 秒犯規" : "移除犯規"}
        />
        <div style={{ display: "flex", gap: "2cqi", marginTop: "1cqi" }}>
          <Button
            fontSize="1.6cqi"
            onClick={() => onDecision(1)}
            angle={angle}
            style={{ padding: "1cqi 2cqi" }}
          >
            <StableLocaleText
              as="span"
              locale={locale}
              visible={localeVisible}
              en={isAdd ? "1-Jeom" : "-1 Jeom"}
              zh={isAdd ? "1 分" : "−1 分"}
            />
          </Button>
          <Button
            fontSize="1.6cqi"
            onClick={() => onDecision(2)}
            angle={angle}
            style={{ padding: "1cqi 2cqi" }}
          >
            <StableLocaleText
              as="span"
              locale={locale}
              visible={localeVisible}
              en={isAdd ? "2-Jeom" : "-2 Jeom"}
              zh={isAdd ? "2 分" : "−2 分"}
            />
          </Button>
        </div>
        <Button
          fontSize="1.2cqi"
          variant="cancel"
          onClick={onCancel}
          style={{ marginTop: "1cqi", padding: "0.5cqi 2cqi" }}
        >
          <StableLocaleText
            as="span"
            locale={locale}
            visible={localeVisible}
            en="Cancel"
            zh="取消"
          />
        </Button>
      </div>
    </div>
  );
}

export default AvoidingPenaltyPopup;
