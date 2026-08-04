import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X, Copy, Check, PeopleFill, CheckCircleFill, Globe } from 'react-bootstrap-icons';
import { ref, onValue } from 'firebase/database';
import { database } from '../../firebase';
import './QRCodeDisplay.css';
import Button from '../Button/Button';

function QRCodeDisplay({ eventId, courtId, visible, onClose, refereesData: propRefereesData }) {
  const [copied, setCopied] = useState(false);
  const [referees, setReferees] = useState(propRefereesData || {});
  
  // Custom Network Host state (for localhost dev environment mobile scans)
  const [customHost, setCustomHost] = useState(() => {
    return localStorage.getItem('qrCustomHost') || '';
  });

  // If propRefereesData is not provided, listen to Firebase directly
  useEffect(() => {
    if (propRefereesData) {
      setReferees(propRefereesData);
      return;
    }

    if (!eventId || !courtId) return;

    const refereesRef = ref(database, `events/${eventId}/courts/${courtId}/referees`);
    const unsubscribe = onValue(refereesRef, (snapshot) => {
      setReferees(snapshot.val() || {});
    });

    return () => unsubscribe();
  }, [eventId, courtId, propRefereesData]);

  if (!visible) return null;

  // Calculate referee slot statuses (J1, J2, J3)
  const isJ1 = !!referees?.J1;
  const isJ2 = !!referees?.J2;
  const isJ3 = !!referees?.J3;
  const occupiedCount = (isJ1 ? 1 : 0) + (isJ2 ? 1 : 0) + (isJ3 ? 1 : 0);
  const isFull = occupiedCount === 3;

  // Detect localhost
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Use custom host if set, otherwise current location host
  const protocol = window.location.protocol;
  const host = customHost.trim() || window.location.host;

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
  let controllerUrl = `${protocol}//${host}${basePath}controller?event=${encodeURIComponent(eventId || '')}&court=${encodeURIComponent(courtId || '')}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(controllerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHostChange = (e) => {
    const value = e.target.value;
    setCustomHost(value);
    localStorage.setItem('qrCustomHost', value);
  };

  return (
    <div className="qrcode-modal-overlay" onClick={onClose}>
      <div className="qrcode-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="qrcode-header">
          <div className="qrcode-title">
            <QrCode className="qrcode-icon" />
            <span>Referee Controller QR Code</span>
          </div>
          <Button 
            className="qrcode-close-btn" 
            onClick={onClose} 
            aria-label="Close"
            icon={<X size={24} />}
            fontSize="1rem"
            variant="orange"
          />
        </div>

        <div className="qrcode-body">
          <div className="qrcode-info">
            <span className="qrcode-badge">Event: {eventId || 'N/A'}</span>
            <span className="qrcode-badge court">Court: {courtId || 'N/A'}</span>
          </div>

          {/* Network Host IP Setting (Visible when on localhost or custom host active) */}
          {(isLocalhost || customHost) && (
            <div className="qrcode-host-config">
              <label className="qrcode-host-label">
                <Globe size={14} />
                <span>Network Host / IP (手機連線網址):</span>
              </label>
              <input
                type="text"
                className="qrcode-host-input cursor-target"
                placeholder="例如: 192.168.1.104:5174 或 10.2.0.2:5174"
                value={customHost}
                onChange={handleHostChange}
              />
              {isLocalhost && !customHost && (
                <div className="qrcode-host-warning">
                  ⚠️ 檢測到使用 localhost，手機無法直接連線！請輸入你嘅局域網 IP (如 192.168.1.104:5174 或 10.2.0.2:5174)。
                </div>
              )}
            </div>
          )}

          {/* Real-time Referee Connection Status Badge Panel */}
          <div className={`referee-status-box ${isFull ? 'full' : ''}`}>
            <div className="referee-status-title">
              <PeopleFill size={16} />
              <span>Referees Connected: {occupiedCount}/3</span>
              {isFull && <CheckCircleFill size={16} className="full-icon" />}
            </div>
            <div className="referee-badges-row">
              <span className={`ref-slot-pill ${isJ1 ? 'online' : 'vacant'}`}>
                J1 {isJ1 ? '• Online' : '• Vacant'}
              </span>
              <span className={`ref-slot-pill ${isJ2 ? 'online' : 'vacant'}`}>
                J2 {isJ2 ? '• Online' : '• Vacant'}
              </span>
              <span className={`ref-slot-pill ${isJ3 ? 'online' : 'vacant'}`}>
                J3 {isJ3 ? '• Online' : '• Vacant'}
              </span>
            </div>
          </div>

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
            {isFull ? (
              <span className="text-warning">⚠️ 裁判席位已滿 (All 3 Referee Slots Occupied)</span>
            ) : (
              '請裁判使用手機掃描二維碼開啟控制頁面'
            )}
          </p>

          {/* Controller URL preview and Copy */}
          <div className="qrcode-url-box">
            <input type="text" readOnly value={controllerUrl} className="qrcode-url-input cursor-target" />
            <Button 
              className="qrcode-copy-btn" 
              onClick={handleCopy}
              icon={copied ? <Check size={18} color="#4cd964" /> : <Copy size={18} />}
              text={copied ? '已複製' : '複製'}
              fontSize="0.9rem"
              angle={120}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRCodeDisplay;