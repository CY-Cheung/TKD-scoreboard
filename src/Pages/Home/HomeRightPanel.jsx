import React from "react";
import {
  Display,
  Diagram2,
  PersonBadge,
  ArrowLeftRight,
} from "react-bootstrap-icons";
import Button from "../../Components/Button/Button";
import MarqueeText from "../../Components/MarqueeText";
import { StableLocaleText } from "../../Components/AlternatingLocale/AlternatingLocale";
import { parseEventHeading } from "./parseEventHeading";

/**
 * Home right-hand nav panel (event heading + court + destinations).
 */
export default function HomeRightPanel({
  locale,
  visible,
  fullEventName,
  courtId,
  onCourtSetup,
  onScoreboard,
  onManageMatch,
  onCornerJudge,
}) {
  const { mainEventName, eventDateStr } = parseEventHeading(fullEventName);
  const courtNum =
    courtId?.toString().replace(/court\s*/i, "").trim() || "N/A";

  return (
    <>
      <div
        style={{
          width: "100%",
          textAlign: "center",
          marginBottom: "1.5cqi",
        }}
      >
        <div style={{ width: "100%", overflow: "hidden", textAlign: "center" }}>
          <MarqueeText
            text={mainEventName}
            style={{
              fontSize: "1.6cqi",
              color: "white",
              fontWeight: "bold",
              width: "100%",
            }}
          />
          {eventDateStr && (
            <div
              style={{
                fontSize: "1.6cqi",
                color: "#fff",
                marginTop: "0.4cqi",
                fontWeight: "bold",
              }}
            >
              {eventDateStr}
            </div>
          )}
        </div>
        <div style={{ height: "1cqi" }} />
        <div className="home-court-row">
          <StableLocaleText
            as="div"
            locale={locale}
            visible={visible}
            className="home-court-label"
            en={`Court ${courtNum}`}
            zh={`場地 ${courtNum}`}
          />
          <Button
            onClick={onCourtSetup}
            className="home-court-setup-btn"
            icon={<ArrowLeftRight size="1cqi" />}
            fontSize="1.05cqi"
            angle={0}
            style={{
              padding: "0.55cqi 0.95cqi",
              margin: 0,
              width: "auto",
              whiteSpace: "nowrap",
            }}
          >
            <StableLocaleText
              as="span"
              locale={locale}
              visible={visible}
              en="Court Setup"
              zh="場地設置"
            />
          </Button>
        </div>
      </div>

      <div className="home-nav-container">
        <Button
          onClick={onScoreboard}
          icon={<Display size="1.25cqi" />}
          fontSize="1.35cqi"
          gradient={
            "linear-gradient(90deg, " +
            "var(--red-secondary) 0%, " +
            "var(--red-primary) 5%, " +
            "var(--red-primary) 36%, " +
            "var(--yellow-primary) 42%, " +
            "var(--yellow-primary) 58%, " +
            "var(--blue-primary) 64%, " +
            "var(--blue-primary) 95%, " +
            "var(--blue-secondary) 100%)"
          }
          style={{ padding: "0.8cqi 1.5cqi" }}
        >
          <StableLocaleText
            as="span"
            locale={locale}
            visible={visible}
            en="Scoreboard"
            zh="分牌顯示"
          />
        </Button>
        <Button
          onClick={onManageMatch}
          icon={<Diagram2 size="1.25cqi" />}
          fontSize="1.35cqi"
          angle={90}
          style={{ padding: "0.8cqi 1.5cqi" }}
        >
          <StableLocaleText
            as="span"
            locale={locale}
            visible={visible}
            en="Manage Match"
            zh="管理賽事"
          />
        </Button>
        <Button
          onClick={onCornerJudge}
          icon={<PersonBadge size="1.25cqi" />}
          fontSize="1.35cqi"
          angle={180}
          style={{ padding: "0.8cqi 1.5cqi" }}
        >
          <StableLocaleText
            as="span"
            locale={locale}
            visible={visible}
            en="Corner Judge"
            zh="邊裁設定"
          />
        </Button>
      </div>
    </>
  );
}
