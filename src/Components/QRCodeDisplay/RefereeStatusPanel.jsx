import React from "react";
import { PeopleFill, CheckCircleFill, X } from "react-bootstrap-icons";
import { StableLocaleText } from "../AlternatingLocale/AlternatingLocale";
import Button from "../Button/Button";
import { REFEREE_SEAT_ORDER } from "../../Pages/Controller/seatGrab.js";
import {
  CORNER_JUDGE_ZH,
  getRefereeDeviceLabel,
} from "./qrRefereeView.js";

/** Left-panel live J1–J3 badges + disconnect actions. */
export default function RefereeStatusPanel({
  locale,
  localeVisible,
  referees = {},
  occupiedCount,
  isFull,
  onDisconnectSlot,
  onDisconnectAll,
}) {
  return (
    <div className={`referee-status-box ${isFull ? "full" : ""}`}>
      <div
        className="referee-status-title"
        style={{ fontSize: "1.8cqi", fontWeight: "bold" }}
      >
        <PeopleFill size="1.5cqi" />
        <StableLocaleText
          as="span"
          locale={locale}
          visible={localeVisible}
          en={`Corner Judges Connected: ${occupiedCount}/3`}
          zh={`已連線邊裁：${occupiedCount}/3`}
        />
        {isFull && (
          <CheckCircleFill size="1.5cqi" className="full-icon" />
        )}
      </div>
      <div className="referee-badges-row">
        {REFEREE_SEAT_ORDER.map((slotName, index) => {
          const refData = referees?.[slotName];
          const isConnected = !!refData;
          const deviceName = getRefereeDeviceLabel(refData);
          const chineseLabel = CORNER_JUDGE_ZH[index];

          return (
            <span
              key={slotName}
              className={`ref-slot-pill ${isConnected ? "online" : "vacant"}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              <StableLocaleText
                as="span"
                locale={locale}
                visible={localeVisible}
                en={
                  isConnected
                    ? `Corner Judge ${index + 1} • ${deviceName}`
                    : `Corner Judge ${index + 1} • Vacant`
                }
                zh={
                  isConnected
                    ? `邊裁${chineseLabel} • ${deviceName}（已連線）`
                    : `邊裁${chineseLabel} • 空缺`
                }
              />
              <Button
                onClick={() => onDisconnectSlot?.(slotName, index)}
                icon={<X size="1.5cqi" />}
                style={{
                  padding: "0.2cqi",
                  minHeight: "unset",
                  marginLeft: "1cqi",
                  borderRadius: "50%",
                }}
                variant="red"
                title={`Disconnect ${slotName}`}
              />
            </span>
          );
        })}
      </div>
      {occupiedCount > 0 && (
        <Button
          variant="red"
          onClick={onDisconnectAll}
          fontSize="1.4cqi"
          style={{ marginTop: "0.52cqi", width: "100%" }}
        >
          <StableLocaleText
            as="span"
            locale={locale}
            visible={localeVisible}
            en="Disconnect All"
            zh="斷開所有"
          />
        </Button>
      )}
    </div>
  );
}
