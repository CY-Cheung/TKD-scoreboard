import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X, Copy, Check } from 'react-bootstrap-icons';
import './QRCodeDisplay.css';

function QRCodeDisplay({ eventId, courtId, visible, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!visible) return null;

  // Use current window location host & protocol directly
  const protocol = window.location.protocol;
  const host = window.location.host;

  // Extract clean base path
  let basePath = window.location.pathname;
  if (basePath.includes('/screen')) {
    basePath = basePath.replace(/\/screen\/?$/, '/');
  } else if (basePath.includes('/controller')) {
    basePath = basePath.replace(/\/controller\/?$/, '/');
  }
  if (!basePath.endsWith('/')) {
    basePath += '/';
  }

  // Build default BrowserRouter controller URL
  const controllerUrl = `${protocol}//${host}${basePath}controller?event=${encodeURIComponent(eventId || '')}&court=${encodeURIComponent(courtId || '')}`;

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

          {/* QR Code Container */}
          <div className="qrcode-wrapper">
            <QRCodeSVG
              value={controllerUrl}
              size={220}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
              includeMargin={true}
            />
          </div>

          <p className="qrcode-instructions">
            請用手機掃描二維碼開啟裁判控制器
          </p>

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