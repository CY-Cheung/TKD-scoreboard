import React from "react";
import { Trash, Funnel, Diagram3 } from "react-bootstrap-icons";
import Button from "../../Components/Button/Button";
import { StableLocaleText } from "../../Components/AlternatingLocale/AlternatingLocale";
import {
  getCompetitorDisplayText,
  parseEventDisplayParts,
} from "./matchListUtils";

/**
 * Presentational matches header + list for DataImport.
 */
export default function MatchesList({
  locale,
  localeVisible,
  eventDisplayName,
  availableDates,
  selectedDateFilter,
  onDateFilterChange,
  onOpenBracket,
  filteredMatchIds,
  currentMatches,
  selectedMatchId,
  onSelectMatch,
  onDeleteMatch,
}) {
  const parts = parseEventDisplayParts(eventDisplayName || "Event");

  return (
    <div className="di-matches-section">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          marginBottom: "0.42cqi",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
          paddingBottom: "0.31cqi",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3
            style={{
              margin: 0,
              border: "none",
              padding: 0,
              color: "#fff",
              fontSize: "1.19cqi",
            }}
          >
            {parts.title}
          </h3>
          {availableDates.length > 1 && (
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.21cqi" }}
            >
              <Funnel size="0.62cqi" color="#FFFF00" />
              <select
                value={selectedDateFilter}
                onChange={(e) => onDateFilterChange(e.target.value)}
                style={{
                  padding: "2px 0.31cqi",
                  borderRadius: "0.21cqi",
                  border: "1px solid rgba(255,255,0,0.5)",
                  backgroundColor: "#111",
                  color: "#FFFF00",
                  fontSize: "0.68cqi",
                }}
              >
                <option value="all">
                  {locale === "en" ? "📅 All Dates" : "📅 所有日期"}
                </option>
                {availableDates.map((dStr) => (
                  <option key={dStr} value={dStr}>
                    📅 {dStr}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "0.21cqi",
          }}
        >
          {parts.dayLabel ? (
            <span style={{ fontSize: "1cqi", color: "#ccc" }}>
              {parts.dayLabel} - {parts.subLabel}
            </span>
          ) : (
            <span />
          )}
          <Button
            icon={<Diagram3 size="0.83cqi" />}
            onClick={onOpenBracket}
            fontSize="0.81cqi"
            style={{ padding: "0.31cqi 0.62cqi" }}
          >
            <StableLocaleText
              as="span"
              locale={locale}
              visible={localeVisible}
              en="Bracket"
              zh="賽程表"
            />
          </Button>
        </div>
      </div>
      <div className="matches-list">
        <ul>
          {filteredMatchIds.map((mId) => {
            const blue = currentMatches[mId].config.competitors.blue;
            const red = currentMatches[mId].config.competitors.red;
            const isSelected = selectedMatchId === mId;

            return (
              <li
                key={mId}
                className={`match-row${isSelected ? " is-selected" : ""}`}
              >
                <div
                  className={`match-row-main${isSelected ? " selected" : ""}`}
                  onClick={() => onSelectMatch(isSelected ? null : mId)}
                >
                  <div className="match-row-text">
                    <strong style={{ color: "#fff", marginRight: "0.21cqi" }}>
                      {mId}:
                    </strong>
                    <span style={{ color: "#3399ff" }}>
                      {getCompetitorDisplayText(blue)}
                    </span>
                    <span
                      style={{
                        color: "#fff",
                        margin: "0 0.5cqi",
                        fontSize: "1cqi",
                      }}
                    >
                      VS
                    </span>
                    <span style={{ color: "#ff3b30" }}>
                      {getCompetitorDisplayText(red)}
                    </span>
                  </div>
                </div>
                <div className="match-row-delete">
                  <Button
                    angle={350}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMatch();
                    }}
                    icon={<Trash size="0.83cqi" />}
                    style={{
                      whiteSpace: "nowrap",
                      padding: "0.35cqi 0.55cqi",
                      fontSize: "0.72cqi",
                      margin: 0,
                      backgroundColor: "#ff3b30",
                    }}
                  >
                    <StableLocaleText
                      as="span"
                      locale={locale}
                      visible={localeVisible}
                      en="Delete"
                      zh="刪除"
                    />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
