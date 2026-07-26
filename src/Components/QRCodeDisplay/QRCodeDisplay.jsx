import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X, Copy, Check, ExclamationTriangle, Gear } from 'react-bootstrap-icons';
import './QRCodeDisplay.css';

function QRCodeDisplay({ eventId, courtId, visible, onClose }) {
  const [copied, setCopied] = useState(false);
  const [customHost, setCustomHost] = useState(() => localStorage.getItem('customHostIp') || '');
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    if (customHost) {
      localStorage.setItem('customHostIp', customHost);
    }
  }, [customHost]);

  if (!visible) return null;

  const currentHost = window.location.host; // e.g. "localhost:5173" or "192.168.1.104:5173"
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Determine effective host
  let effectiveHost = currentHost;
  if (customHost.trim()) {
    // If user typed a custom host/IP (with or without port)
    let hostInput = customHost.trim().replace(/^https?:\/\//, '');
    // If no port specified and original host has a port, append port
    if (!hostInput.includes(':') && window.location.port) {
      hostInput = `${hostInput}:${window.location.port}`;
    }
    effectiveHost = hostInput;
  }

  // Build full controller URL
  const protocol = window.location.protocol;
  const pathname = window.location.pathname;
  const baseUrl = `${protocol}//${effectiveHost}${pathname}`;
  const controllerUrl = `${baseUrl}#/controller?event=${encodeURIComponent(eventId || '')}&court=${encodeURIComponent(courtId || '')}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(controllerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="qrcode-modal-overlay" onClick={onClose}>
      <div className="qrcode-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="qrcode-header">
          <div className="qrcode-title">
            <QrCode className="qrcode-icon" />
            <span>Referee Controller QR Code</span>
          </div>
          <button className="qrcode-close-btn" onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>

        <div className="qrcode-body">
          <div className="qrcode-info">
            <span className="qrcode-badge">Event: {eventId || 'N/A'}</span>
            <span className="qrcode-badge court">Court: {courtId || 'N/A'}</span>
          </div>

          {/* Localhost Warning Notice */}
          {isLocalhost && !customHost.trim() && (
            <div className="qrcode-warning-banner">
              <ExclamationTriangle size={18} className="warning-icon" />
              <span>
                目前使用 <strong>localhost</strong>。手機掃碼無法連入電腦，請在下方設定電腦的局域網 IP (如 192.168.1.104)。
              </span>
            </div>
          )}

          {/* QR Code Container */}
          <div className="qrcode-wrapper">
            <QRCodeSVG
              value={controllerUrl}
              size={200}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
              includeMargin={true}
            />
          </div>

          <p className="qrcode-instructions">
            請用手機掃描二維碼開啟裁判控制器
          </p>

          {/* Host IP / Domain Config Box */}
          <div className="qrcode-ip-config-box">
            <div className="ip-config-header">
              <label htmlFor="host-ip-input">
                <Gear size={14} /> 主機 IP / 網址 (Host IP):
              </label>
              {customHost && (
                <button className="clear-ip-btn" onClick={() => setCustomHost('')}>
                  重設為預設
                </button>
              )}
            </div>
            <input
              id="host-ip-input"
              type="text"
              className="ip-config-input"
              placeholder="例如: 192.168.1.104 或 ngrok 網址"
              value={customHost}
              onChange={(e) => setCustomHost(e.target.value)}
            />
          </div>

          {/* Controller URL preview and Copy */}
          <div className="qrcode-url-box">
            <input type="text" readOnly value={controllerUrl} className="qrcode-url-input" />
            <button className="qrcode-copy-btn" onClick={handleCopy}>
              {copied ? <Check size={18} color="#4cd964" /> : <Copy size={18} />}
              {copied ? '已複製' : '複製'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRCodeDisplay;