import React from "react";
import MarqueeText from "../MarqueeText";
import { parseEventHeading } from "../../Pages/Home/parseEventHeading.js";

/** Event title + optional date line above the QR code. */
export default function QrEventHeading({ eventName, eventId }) {
  const fullEventName = eventName || eventId || "N/A";
  const { mainEventName, eventDateStr } = parseEventHeading(fullEventName);

  return (
    <div style={{ width: "100%", overflow: "hidden", textAlign: "center" }}>
      <MarqueeText
        text={mainEventName}
        style={{
          fontSize: "2.6cqi",
          fontWeight: "bold",
          color: "#fff",
          width: "100%",
        }}
      />
      {eventDateStr && (
        <div
          style={{
            fontSize: "2.2cqi",
            fontWeight: "bold",
            color: "#fff",
            marginTop: "0.4cqi",
          }}
        >
          {eventDateStr}
        </div>
      )}
    </div>
  );
}
