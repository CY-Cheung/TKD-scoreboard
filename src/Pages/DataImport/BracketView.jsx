import React from "react";
import { ArrowLeft, Diagram3 } from "react-bootstrap-icons";
import Button from "../../Components/Button/Button";
import { StableLocaleText } from "../../Components/AlternatingLocale/AlternatingLocale";
import TournamentBracket from "../../Components/TournamentBracket/TournamentBracket";

/**
 * Full-panel bracket view for DataImport (replaces form+list while open).
 */
export default function BracketView({
  locale,
  localeVisible,
  eventTitle,
  currentMatches,
  bracketZoom,
  setBracketZoom,
  onBack,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      <div
        style={{
          padding: "0.52cqi 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: "0.78cqi" }}
        >
          <Button
            onClick={onBack}
            icon={<ArrowLeft size="0.83cqi" />}
            fontSize="0.77cqi"
            angle={180}
          >
            <StableLocaleText
              as="span"
              locale={locale}
              visible={localeVisible}
              en="Back"
              zh="返回"
            />
          </Button>
          <h2
            style={{
              margin: 0,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "0.52cqi",
              fontSize: "1.19cqi",
            }}
          >
            <Diagram3 size="1.66cqi" color="#FFFF00" /> {eventTitle}
          </h2>
        </div>
        <div
          style={{ display: "flex", alignItems: "center", gap: "0.52cqi" }}
        >
          <Button
            onClick={() => setBracketZoom((z) => Math.max(0.1, z - 0.1))}
            text="-"
            angle={0}
            style={{ padding: "2px 0.52cqi", minWidth: "2.08cqi" }}
            fontSize="0.8cqi"
          />
          <span
            style={{
              color: "#fff",
              minWidth: "2.6cqi",
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "0.8cqi",
            }}
          >
            {Math.round(bracketZoom * 100)}%
          </span>
          <Button
            onClick={() => setBracketZoom((z) => Math.min(3, z + 0.1))}
            text="+"
            angle={180}
            style={{ padding: "2px 0.52cqi", minWidth: "2.08cqi" }}
            fontSize="0.8cqi"
          />
          <Button
            onClick={() => setBracketZoom(1)}
            angle={90}
            style={{
              padding: "0.21cqi 0.78cqi",
              marginLeft: "0.52cqi",
            }}
            fontSize="0.77cqi"
          >
            <StableLocaleText
              as="span"
              locale={locale}
              visible={localeVisible}
              en="Reset"
              zh="重置"
            />
          </Button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "1.04cqi 0" }}>
        {Object.keys(currentMatches).length > 0 ? (
          <div style={{ zoom: bracketZoom }}>
            <TournamentBracket matches={currentMatches} />
          </div>
        ) : (
          <div
            style={{
              color: "#ccc",
              textAlign: "center",
              marginTop: "2.6cqi",
            }}
          >
            <StableLocaleText
              as="span"
              locale={locale}
              visible={localeVisible}
              en="No matches available to display bracket."
              zh="沒有可顯示的賽程表。"
            />
          </div>
        )}
      </div>
    </div>
  );
}
