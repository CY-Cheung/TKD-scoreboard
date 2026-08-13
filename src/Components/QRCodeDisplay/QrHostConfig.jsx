import React from "react";
import { Globe, Copy, Check } from "react-bootstrap-icons";
import Button from "../Button/Button";
import { PUBLIC_PAGES_HOST } from "./controllerQrUrl.js";

/** Optional Network Host / IP + copyable controller URL. */
export default function QrHostConfig({
  customHost,
  onHostChange,
  controllerUrl,
  usingUnreachableDefault,
  copied,
  onCopy,
}) {
  return (
    <div className="qrcode-host-config" style={{ marginBottom: "0.8cqi" }}>
      <label className="qrcode-host-label">
        <Globe size="1.2cqi" />
        <span>Network Host / IP（手機連線網址）</span>
      </label>
      <input
        type="text"
        className="qrcode-host-input cursor-target"
        placeholder={`空白 = ${PUBLIC_PAGES_HOST}；或填 192.168.x.x:5173`}
        value={customHost}
        onChange={onHostChange}
      />
      {usingUnreachableDefault && (
        <div className="qrcode-host-warning" style={{ fontSize: "1.1cqi" }}>
          ⚠️ Preview／localhost 手機開唔到。QR 已自動用 GitHub Pages：
          {PUBLIC_PAGES_HOST}
          。請先 deploy 呢個 branch，或改填同 Wi‑Fi 嘅 LAN IP。
        </div>
      )}
      <div className="qrcode-url-box" style={{ marginTop: "0.5cqi" }}>
        <input
          className="qrcode-url-input"
          readOnly
          value={controllerUrl}
          title={controllerUrl}
        />
        <Button
          onClick={onCopy}
          icon={copied ? <Check size="1.2cqi" /> : <Copy size="1.2cqi" />}
          variant="yellow"
          fontSize="1.2cqi"
          style={{ padding: "0.4cqi 0.8cqi", minHeight: "unset" }}
          aria-label="Copy controller URL"
        />
      </div>
    </div>
  );
}
