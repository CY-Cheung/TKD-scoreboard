import React from "react";
import { PlusCircle, Display, House } from "react-bootstrap-icons";
import Button from "../../Components/Button/Button";
import { StableLocaleText } from "../../Components/AlternatingLocale/AlternatingLocale";

/** DataImport form action row: Add / Load / Home. */
export default function MatchActionButtons({
  locale,
  localeVisible,
  selectedMatchId,
  onAddMatch,
  onLoadMatch,
  onHome,
}) {
  return (
    <div className="di-action-buttons">
      <Button
        angle={260}
        onClick={onAddMatch}
        icon={<PlusCircle size="1.15cqi" />}
        fontSize="1.05cqi"
        style={{
          flex: 1,
          whiteSpace: "nowrap",
          padding: "0.55cqi 0.35cqi",
        }}
      >
        <StableLocaleText
          as="span"
          locale={locale}
          visible={localeVisible}
          en="Add Match"
          zh="新增比賽"
        />
      </Button>
      <Button
        angle={40}
        onClick={selectedMatchId ? onLoadMatch : null}
        disabled={!selectedMatchId}
        icon={<Display size="1.15cqi" />}
        fontSize="1.05cqi"
        style={{
          flex: 1,
          whiteSpace: "nowrap",
          padding: "0.55cqi 0.35cqi",
        }}
      >
        <StableLocaleText
          as="span"
          locale={locale}
          visible={localeVisible}
          en="Load"
          zh="載入"
        />
      </Button>
      <Button
        angle={150}
        onClick={onHome}
        icon={<House size="1.15cqi" />}
        fontSize="1.05cqi"
        style={{
          flex: 1,
          whiteSpace: "nowrap",
          padding: "0.55cqi 0.35cqi",
        }}
      >
        <StableLocaleText
          as="span"
          locale={locale}
          visible={localeVisible}
          en="Home"
          zh="主頁"
        />
      </Button>
    </div>
  );
}
