import React from "react";
import { StableLocaleText } from "../AlternatingLocale/AlternatingLocale";
import Button from "../Button/Button";
import { canEnableMultipleRefereeMode } from "./qrRefereeView.js";

/** Single vs multiple corner-judge scoring mode controls. */
export default function RefereeModeSelector({
  locale,
  localeVisible,
  refereeMode = "single",
  occupiedCount = 0,
  onModeChange,
}) {
  const multipleOk = canEnableMultipleRefereeMode(occupiedCount);

  return (
    <div className="referee-mode-selector">
      <StableLocaleText
        as="span"
        locale={locale}
        visible={localeVisible}
        style={{ fontSize: "1.8cqi", color: "#ccc", fontWeight: "bold" }}
        en="Scoring Mode"
        zh="計分模式"
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.52cqi",
          marginTop: "0.52cqi",
        }}
      >
        <Button
          variant={refereeMode === "single" ? "yellow" : "gray"}
          onClick={() => onModeChange?.("single")}
          fontSize="1.6cqi"
          style={{ flex: 1 }}
        >
          <StableLocaleText
            as="span"
            locale={locale}
            visible={localeVisible}
            en="Single Corner Judge"
            zh="一位邊裁"
          />
        </Button>
        <Button
          variant={refereeMode === "multiple" ? "yellow" : "gray"}
          onClick={() => onModeChange?.("multiple")}
          disabled={!multipleOk}
          fontSize="1.6cqi"
          style={{ flex: 1, opacity: multipleOk ? 1 : 0.5 }}
          title={
            multipleOk
              ? "2 or more referees must agree within 1 second to score"
              : "Requires at least 2 referees"
          }
        >
          <StableLocaleText
            as="span"
            locale={locale}
            visible={localeVisible}
            en="Multiple Corner Judges"
            zh="多位邊裁"
          />
        </Button>
      </div>
      {refereeMode === "multiple" && (
        <StableLocaleText
          as="div"
          locale={locale}
          visible={localeVisible}
          style={{
            fontSize: "1.1cqi",
            color: "#ffcc00",
            marginTop: "0.52cqi",
          }}
          en="✓ Valid Point Mode: 2+ judges must agree within 1 second."
          zh="✓ 有效得分模式：至少 2 位邊裁須於 1 秒內一致確認。"
        />
      )}
      {!multipleOk && (
        <StableLocaleText
          as="div"
          locale={locale}
          visible={localeVisible}
          style={{
            fontSize: "1.2cqi",
            color: "#ffc107",
            marginTop: "0.52cqi",
            textAlign: "center",
          }}
          en="⚠️ Multiple mode requires at least 2 connected judges."
          zh="⚠️ 多位模式需要至少 2 位已連線邊裁。"
        />
      )}
    </div>
  );
}
