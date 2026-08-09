import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../../firebase';
import { ref, get, set, remove, update } from "firebase/database";
import { useAuth } from '../../Context/AuthContext';
import { FolderPlus, Trash, ExclamationTriangle, Key, FileEarmarkPdf, FileEarmarkArrowUp, BoxArrowRight, CheckCircle, House, XCircle, Github } from 'react-bootstrap-icons';
import { parseHktkdaPdfFile } from '../../Utils/pdfParser';
import { usePopup } from '../../Context/PopupContext';

import './CourtSetup.css';
import Button from '../../Components/Button/Button';

function CourtSetup() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [courtId, setCourtId] = useState('');
  const [courtOptions, setCourtOptions] = useState([]);
  const [authError, setAuthError] = useState('');
  const { showToast, showConfirm } = usePopup();

  // Create Event Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventId, setNewEventId] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [newSetupPassword, setNewSetupPassword] = useState('');
  const [newMaxPointGap, setNewMaxPointGap] = useState(15);
  const [newMaxGamjeom, setNewMaxGamjeom] = useState(5);
  const [newRoundDuration, setNewRoundDuration] = useState(90);
  const [newRestDuration, setNewRestDuration] = useState(60);
  const [courtCount, setCourtCount] = useState(4); // Default 4 courts

  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef(null);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfParseResult, setPdfParseResult] = useState(null);

  const navigate = useNavigate();
  const { user, userLoading, googleLogin, googleLogout, login } = useAuth();

  // Load events from Firebase
  const fetchEvents = () => {
    if (!user) return;
    setAuthError('');

    const eventsRef = ref(database, 'events');
    get(eventsRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const eventList = Object.keys(val).map(key => {
            const item = val[key];
            const displayName = item?.EventName || item?.eventName || item?.settings?.eventName || item?.name || key;
            return { id: key, displayName, createdBy: item?.createdBy || null };
          });
          setEvents(eventList);

          const lastEvent = sessionStorage.getItem('selectedEvent');
          const validIds = eventList.map(e => e.id);
          if (selectedEvent && validIds.includes(selectedEvent)) {
            // Keep current selection
          } else if (lastEvent && validIds.includes(lastEvent)) {
            setSelectedEvent(lastEvent);
          } else if (eventList.length > 0) {
            setSelectedEvent(eventList[0].id);
          }
        } else {
          setEvents([]);
          setSelectedEvent('');
        }
      })
      .catch(err => {
        console.error("Error fetching events:", err);
        setAuthError("Failed to fetch events from database. Please check your network or login.");
      });
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  useEffect(() => {
    if (selectedEvent && user) {
      const courtsRef = ref(database, `events/${selectedEvent}/courts`);
      get(courtsRef).then((snapshot) => {
        if (snapshot.exists()) {
          setCourtOptions(Object.keys(snapshot.val()));
          const lastCourt = sessionStorage.getItem('selectedCourt');
          if (lastCourt && Object.keys(snapshot.val()).includes(lastCourt)) {
            setCourtId(lastCourt);
          } else {
            setCourtId('');
          }
        } else {
          setCourtOptions([]);
          setCourtId('');
        }
      });
    } else {
      setCourtOptions([]);
      setCourtId('');
    }
  }, [selectedEvent, user]);

  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      await googleLogin();
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      setAuthError(`Login failed: ${err.message}`);
    }
  };

  // PDF File Upload Handler
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      showToast('請選擇有效的 PDF 賽程文件！');
      return;
    }

    setIsParsingPdf(true);
    try {
      const result = await parseHktkdaPdfFile(file);
      if (!result || result.matchCount === 0) {
        showToast('未能在 PDF 中解析出有效賽程，請確認格式是否為香港跆拳道協會對陣表。');
      } else {
        setPdfParseResult(result);
        setNewEventName(result.eventName);
        if (!newEventId) {
          setNewEventId('TKD' + Date.now().toString().slice(-6));
        }
      }
    } catch (error) {
      console.error("PDF Parsing Failed:", error);
      showToast(`解析 PDF 失敗: ${error.message}`);
    } finally {
      setIsParsingPdf(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Create Event Handler
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast('🔒 請先登入 Google 帳號！');
      return;
    }

    const trimmedId = newEventId.trim();
    const trimmedName = newEventName.trim();

    if (!trimmedId || !trimmedName) {
      showToast('請提供有效的 Event ID 與 Event Name！');
      return;
    }

    const generatedCourts = {};
    const count = Math.max(1, Math.min(12, parseInt(courtCount, 10) || 4));
    for (let i = 1; i <= count; i++) {
      generatedCourts[`court${i}`] = { name: `court${i}`, currentMatchId: '' };
    }

    try {
      const finalRules = {
        maxPointGap: parseInt(newMaxPointGap, 10) || 15,
        maxGamjeom: parseInt(newMaxGamjeom, 10) || 5,
        roundDuration: parseInt(newRoundDuration, 10) || 90,
        restDuration: parseInt(newRestDuration, 10) || 60
      };

      if (pdfParseResult) {
        if (pdfParseResult.dateGroups) {
          Object.values(pdfParseResult.dateGroups).forEach(group => {
            if (group.matches) {
              Object.values(group.matches).forEach(m => {
                if (m.config) m.config.rules = { ...m.config.rules, ...finalRules };
              });
            }
          });
        } else if (pdfParseResult.matches) {
          Object.values(pdfParseResult.matches).forEach(m => {
            if (m.config) m.config.rules = { ...m.config.rules, ...finalRules };
          });
        }

        if (pdfParseResult.datesList?.length > 1) {
          let createdCount = 0;
          let firstCleanDate = '';

          for (let i = 0; i < pdfParseResult.datesList.length; i++) {
            const dateStr = pdfParseResult.datesList[i];
            const parts = dateStr.split('/');
            let formattedDate = dateStr;
            let cleanDate = dateStr.replace(/[^0-9]/g, '');
            if (parts.length === 3) {
              const [d, m, y] = parts;
              formattedDate = `${y}/${m.padStart(2, '0')}/${d.padStart(2, '0')}`;
              cleanDate = `${y}${m.padStart(2, '0')}${d.padStart(2, '0')}`;
            }
            if (i === 0) firstCleanDate = cleanDate;

            const subEventId = `${trimmedId}_Day${i + 1}_${cleanDate}`;
            const subEventName = `${trimmedName} (Day ${i + 1}) (${formattedDate})`;

            const eventRef = ref(database, `events/${subEventId}`);
            await set(eventRef, {
              EventName: subEventName,
              createdBy: user.uid,
              createdByEmail: user.email || '',
              createdAt: Date.now(),
              matchDate: formattedDate,
              settings: {
                setupPassword: newSetupPassword,
                maxPointGap: parseInt(newMaxPointGap, 10) || 15,
                maxGamjeom: parseInt(newMaxGamjeom, 10) || 5,
                roundDuration: parseInt(newRoundDuration, 10) || 90,
                restDuration: parseInt(newRestDuration, 10) || 60
              },
              courts: generatedCourts,
              matches: pdfParseResult.dateGroups[dateStr].matches
            });
            createdCount++;
          }

          showToast(`✅ 成功按 ${pdfParseResult.datesList.length} 個比賽日期拆分並建立 ${createdCount} 個子賽事！`);
          setSelectedEvent(`${trimmedId}_Day1_${firstCleanDate}`);
        } else {
          const dateStr = pdfParseResult.datesList?.[0] || '';
          let formattedDate = dateStr;
          if (dateStr) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              const [d, m, y] = parts;
              formattedDate = `${y}/${m.padStart(2, '0')}/${d.padStart(2, '0')}`;
            }
          }

          const eventRef = ref(database, `events/${trimmedId}`);
          await set(eventRef, {
            EventName: trimmedName,
            createdBy: user.uid,
            createdByEmail: user.email || '',
            createdAt: Date.now(),
            matchDate: formattedDate,
            settings: {
              setupPassword: newSetupPassword,
              maxPointGap: parseInt(newMaxPointGap, 10) || 15,
              maxGamjeom: parseInt(newMaxGamjeom, 10) || 5,
              roundDuration: parseInt(newRoundDuration, 10) || 90,
              restDuration: parseInt(newRestDuration, 10) || 60
            },
            courts: generatedCourts,
            matches: pdfParseResult.matches
          });
          showToast(`✅ 成功建立賽事並匯入賽程：${trimmedName}`);
          setSelectedEvent(trimmedId);
        }
      } else {
        const eventRef = ref(database, `events/${trimmedId}`);
        await set(eventRef, {
          EventName: trimmedName,
          createdBy: user.uid,
          createdByEmail: user.email || '',
          createdAt: Date.now(),
          settings: {
            setupPassword: newSetupPassword,
            maxPointGap: parseInt(newMaxPointGap, 10) || 15,
            maxGamjeom: parseInt(newMaxGamjeom, 10) || 5,
            roundDuration: parseInt(newRoundDuration, 10) || 90,
            restDuration: parseInt(newRestDuration, 10) || 60
          },
          courts: generatedCourts,
          matches: {}
        });
        showToast(`✅ 成功建立賽事：${trimmedName} (${trimmedId})，包含 ${count} 個場地！`);
        setSelectedEvent(trimmedId);
      }

      setNewEventId('');
      setNewEventName('');
      setNewSetupPassword('');
      setNewMaxPointGap(15);
      setNewMaxGamjeom(5);
      setNewRoundDuration(90);
      setNewRestDuration(60);
      setCourtCount(4);
      setPdfParseResult(null);
      setShowCreateModal(false);
      fetchEvents();

    } catch (err) {
      console.error("Create Event Failed:", err);
      showToast(`建立賽事失敗: ${err.message}`);
    }
  };

  const promptDeleteEvent = () => {
    if (!selectedEvent) {
      showToast('請先選擇要刪除的賽事。');
      return;
    }
    if (!user) {
      showToast('🔒 請先登入 Google 帳號！');
      return;
    }

    const eventData = events.find(e => e.id === selectedEvent);
    if (eventData && eventData.createdByEmail && eventData.createdByEmail !== user.email) {
      showToast('❌ 只有賽事的建立者可以刪除此賽事！');
      return;
    }

    showConfirm({
        title: '刪除賽事確認 (Confirm Delete)',
        message: `您確定要刪除賽事「${selectedEvent}」嗎？\n⚠️ 此操作會將該賽事下的所有比賽數據、場地設定及賽程永久刪除，無法復原！`,
        onConfirm: confirmDeleteEvent,
        confirmText: 'Confirm Delete',
        cancelText: 'Cancel'
    });
  };

  // Confirm Delete Event Execution
  const confirmDeleteEvent = async () => {
    if (!selectedEvent || !user) return;
    setIsDeleting(true);

    try {
      const eventRef = ref(database, `events/${selectedEvent}`);
      await remove(eventRef);
      showToast(`🗑️ 賽事 ${selectedEvent} 已成功刪除！`);
      setSelectedEvent('');
      fetchEvents();
    } catch (err) {
      console.error("Delete Event Failed:", err);
      showToast(`刪除賽事失敗：只有該賽事的建立者或協作者可以刪除！\n(${err.message})`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedEvent) {
      setError('Please select an event.');
      return;
    }

    if (!courtId) {
      setError('Please select a court.');
      return;
    }

    const performLogin = async () => {
      const courtRef = ref(database, `events/${selectedEvent}/courts/${courtId}`);
      // 只更新 name，避免覆蓋正在進行的比賽狀態 (currentMatchId)
      await update(courtRef, {
        name: courtId
      });

      const selectedEventData = events.find(evt => evt.id === selectedEvent);
      const eventDisplayName = selectedEventData?.displayName || selectedEvent;

      login({
        eventId: selectedEvent,
        courtId: courtId,
        eventName: eventDisplayName
      });

      navigate('/');
    };

    const selectedEventData = events.find(evt => evt.id === selectedEvent);
    const isCreator = user && selectedEventData && (user.email === selectedEventData.createdByEmail || user.uid === selectedEventData.createdBy);

    if (isCreator) {
      try {
        await performLogin();
      } catch (err) {
        setError('An error occurred during login.');
        console.error("Error during setup:", err);
      }
      return;
    }

    const settingsRef = ref(database, `events/${selectedEvent}/settings/setupPassword`);

    try {
      const snapshot = await get(settingsRef);
      if (snapshot.exists()) {
        const correctPassword = snapshot.val();
        if (password === correctPassword) {
          await performLogin();
        } else {
          setError('Incorrect password, please try again.');
        }
      } else {
        setError('Setup Password has not been configured for this event. Please contact an administrator.');
      }
    } catch (err) {
      setError('An error occurred while connecting to the database.');
      console.error("Error during setup:", err);
    }
  };


    const toggleFullScreen = (e) => {
        if (e.target === e.currentTarget) {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => console.log(err));
            } else {
                document.exitFullscreen();
            }
        }
    };
  return (
    <div className="cs-container aurora-bg" onDoubleClick={toggleFullScreen}>
      <div className="cs-content glass-card split-layout">
      {user && (
        <div style={{ position: 'absolute', bottom: '1.5cqi', right: '1.5cqi', zIndex: 50, backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.52cqi 0.78cqi', borderRadius: '0.78cqi', backdropFilter: 'blur(0.52cqi)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.62cqi', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.52cqi' }}>
            {user.photoURL ? (
              <img src={user.photoURL} alt="User Avatar" style={{ width: '1.66cqi', height: '1.66cqi', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '1.66cqi', height: '1.66cqi', borderRadius: '50%', backgroundColor: '#6c5ce7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85cqi' }}>
                {user.displayName?.[0] || 'U'}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.77cqi', lineHeight: '1.2' }}>{user.displayName || 'User'}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.64cqi', lineHeight: '1.2' }}>{user.email}</div>
            </div>
          </div>
          <Button
            onClick={googleLogout}
            title="Sign Out of Google Account"
            fontSize="0.72cqi"
            variant="orange"
            icon={<BoxArrowRight size="0.73cqi" />}
            text="Logout (登出)"
            style={{ padding: '0.31cqi 0.62cqi', minWidth: 'auto', margin: 0 }}
          />
        </div>
      )}
        <div className="cs-left-panel">
          <div className="cs-title-container">
            <h1 style={{ fontSize: '3.5cqi', lineHeight: '1.1' }}>Taekwondo<br />Scoreboard</h1>
            <div style={{ fontSize: '1.5cqi', color: '#fbc531', margin: '0.3cqi 0 0 0', fontWeight: '700', letterSpacing: '0.3cqi', textTransform: 'uppercase' }}>Kyorugi</div>
            <h2 style={{ fontSize: '1.5cqi', color: 'rgba(255,255,255,0.9)', margin: '0.8cqi 0 0 0', fontWeight: 'normal', letterSpacing: '0.1cqi' }}>跆拳道搏擊比賽計分系統</h2>
            <ul className="cs-app-intro-list">
                            <li><strong>Cloud-Powered (雲端驅動)</strong>：只要連到上網，隨時隨地都可以開波計分！無須安裝任何軟件。</li>
                            <li><strong>Scan & Score (掃描即用)</strong>：裁判只需用手機掃描 QR Code，一秒連接，即刻開始畀分。</li>
                            <li><strong>One Account (一鍵開賽)</strong>：只需要一個 Google 帳號登入，就可以輕鬆創建及管理整場賽事。</li>
                            <li><strong>Auto Bracket (魔法對戰表)</strong>：支援多個 Court 同時作賽，賽果實時同步，晉級表自動 Update！</li>
                        </ul>
          </div>
          <div className="cs-footer-links">
            <a href="https://github.com/CY-Cheung/TKD-scoreboard" target="_blank" rel="noopener noreferrer">
              <Github size="1.04cqi" /> GitHub Repository
            </a>
          </div>
        </div>

        <div className="cs-divider"></div>

        <div className="cs-right-panel">
          {userLoading ? (
            <p>Loading authentication state...</p>
          ) : !user ? (
            /* Google Sign-in Login Required Block */
            <div className="cs-form" style={{ textAlign: 'center', padding: '2cqi' }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: '1.5cqi', marginBottom: '2.5cqi', lineHeight: '1.8', fontWeight: '500', whiteSpace: 'nowrap' }}>
                <div>無需繁瑣註冊！</div>
                <div>一鍵登入即可開賽。</div>
              </div>
              {authError && <p className="cs-error-message">{authError}</p>}
              <div className="google-btn-wrapper" style={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  onClick={handleGoogleSignIn}
                  text="Google (登入)"
                  icon={<Key size="1.6cqi" />}
                  fontSize="1.3cqi"
                  variant="gemini"
                  style={{ padding: '1cqi 2cqi' }}
                />
              </div>
              <div style={{ fontSize: '1.05cqi', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2cqi', whiteSpace: 'nowrap', lineHeight: '1.6' }}>
                <div>系統將驗證身分並載入賽事</div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="cs-form">
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '0.5dvh' }}>
                  <label htmlFor="event-select" style={{ margin: 0, fontSize: '1cqi' }}>Select Event</label>
                </div>

                <select
                  id="event-select"
                  className="datalist-input"
                  style={{ padding: '0 0.62cqi', fontSize: '0.85cqi', height: '2.34cqi', boxSizing: 'border-box', width: '100%' }}
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  required
                >
                  <option value="" disabled>-- Please select an event --</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.displayName || event.id}
                    </option>
                  ))}
                </select>

                <div style={{ display: 'flex', gap: '0.52cqi', marginTop: '0.52cqi' }}>
                  <Button type="button" onClick={() => setShowCreateModal(true)} text="Create (新增)" fontSize="0.77cqi" angle={120} icon={<FolderPlus size="0.83cqi" />} style={{ flex: 1, whiteSpace: 'nowrap' }} />
                  <Button type="button" onClick={promptDeleteEvent} disabled={!selectedEvent} text="Delete (刪除)" fontSize="0.77cqi" angle={350} icon={<Trash size="0.83cqi" />} style={{ flex: 1, whiteSpace: 'nowrap' }} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="court-select" style={{ fontSize: '1cqi' }}>Select Court</label>
                <select
                  id="court-select"
                  className="datalist-input"
                  style={{ padding: '0 0.62cqi', fontSize: '0.85cqi', height: '2.34cqi', boxSizing: 'border-box', width: '100%' }}
                  value={courtId}
                  onChange={(e) => setCourtId(e.target.value)}
                  disabled={!selectedEvent || courtOptions.length === 0}
                  required
                >
                  <option value="" disabled>-- Please select a court --</option>
                  {courtOptions.map(court => (
                    <option key={court} value={court}>{court}</option>
                  ))}
                </select>
              </div>

              {(!user || (selectedEvent && events.find(e => e.id === selectedEvent) && events.find(e => e.id === selectedEvent).createdByEmail !== user?.email)) && (
                <div className="form-group">
                  <label htmlFor="setup-password" style={{ fontSize: '1cqi' }}>Setup Password</label>
                  <input
                    id="setup-password"
                    type="password"
                    className="datalist-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter setup password"
                    required
                  />
                </div>
              )}

              {error && <p className="cs-error-message">{error}</p>}
              <div className="cs-action-buttons">
                <Button type="submit" text="Confirm (確認)" fontSize="0.85cqi" angle={30} disabled={!selectedEvent || !courtId} icon={<CheckCircle size="0.83cqi" />} style={{ whiteSpace: 'nowrap', padding: '0.52cqi 2.08cqi' }} />
              </div>
            </form>
          )}
        </div>
      </div>

      {/* --- Create Event Modal Overlay --- */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: '#1e1e1e',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '0.62cqi',
            padding: '1.3cqi',
            width: '95%',
            maxWidth: '44.2cqi',
            maxHeight: '90vh',
            overflowY: 'auto',
            color: '#fff',
            boxShadow: '0 0.42cqi 1.66cqi rgba(0,0,0,0.6)',
            textAlign: 'left'
          }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.42cqi', color: '#34c759', fontSize: '1.19cqi' }}>
              <FolderPlus size="1.25cqi" /> 建立新賽事 (Create Event)
            </h3>
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '0.78cqi' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.78cqi', borderRadius: '0.42cqi', display: 'flex', flexDirection: 'column', gap: '0.52cqi', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.52cqi' }}>
                  <FileEarmarkPdf size="1.25cqi" color="#34c759" />
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>上傳 PDF 自動建立 (Optional)</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68cqi' }}>上傳對陣表即可自動填充賽事名稱及匯入所有選手資料。如比賽橫跨多日，系統將自動分拆為多個子賽事。</div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsingPdf}
                  text={isParsingPdf ? 'Parsing...' : 'Select PDF'}
                  icon={<FileEarmarkArrowUp size="0.83cqi" />}
                  fontSize="0.77cqi"
                  angle={60}
                />
                {pdfParseResult && (
                  <div style={{ color: '#4CAF50', fontSize: '0.72cqi', marginTop: '0.26cqi' }}>
                    ✅ 成功解析：{pdfParseResult.matchCount} 場比賽
                    {pdfParseResult.datesList?.length > 1 && ` (包含 ${pdfParseResult.datesList.length} 個日期，將自動分拆為多個賽事)`}
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(10.4cqi, 1fr))', gap: '0.78cqi' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: '#ccc', fontSize: '0.77cqi' }}>Event ID (賽事識別碼)</label>
                  <input
                    type="text"
                    placeholder="例如: TKD2026 (不可重複)"
                    value={newEventId}
                    onChange={e => setNewEventId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.42cqi', borderRadius: '0.21cqi', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: '#ccc', fontSize: '0.77cqi' }}>Event Name (賽事全稱)</label>
                  <input
                    type="text"
                    placeholder="例如: 2026 全港跆拳道錦標賽"
                    value={newEventName}
                    onChange={e => setNewEventName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.42cqi', borderRadius: '0.21cqi', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: '#ccc', fontSize: '0.77cqi' }}>Setup Password (設定密碼)</label>
                  <input
                    type="text"
                    placeholder="例如: BCB2026"
                    value={newSetupPassword}
                    onChange={e => setNewSetupPassword(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.42cqi', borderRadius: '0.21cqi', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(7.8cqi, 1fr))', gap: '0.52cqi' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: '#ccc', fontSize: '0.72cqi' }}>Point Gap (分差)</label>
                  <input type="number" value={newMaxPointGap} onChange={e => setNewMaxPointGap(e.target.value)} style={{ width: '100%', padding: '0.42cqi', borderRadius: '0.21cqi', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: '#ccc', fontSize: '0.72cqi' }}>Max Gam-jeom (犯規上限)</label>
                  <input type="number" value={newMaxGamjeom} onChange={e => setNewMaxGamjeom(e.target.value)} style={{ width: '100%', padding: '0.42cqi', borderRadius: '0.21cqi', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: '#ccc', fontSize: '0.72cqi' }}>Round Duration (回合秒數)</label>
                  <input type="number" value={newRoundDuration} onChange={e => setNewRoundDuration(e.target.value)} style={{ width: '100%', padding: '0.42cqi', borderRadius: '0.21cqi', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: '#ccc', fontSize: '0.72cqi' }}>Rest Duration (休息秒數)</label>
                  <input type="number" value={newRestDuration} onChange={e => setNewRestDuration(e.target.value)} style={{ width: '100%', padding: '0.42cqi', borderRadius: '0.21cqi', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: '#ccc', fontSize: '0.72cqi' }}>Courts Count (1~12)</label>
                  <input type="number" min="1" max="12" value={courtCount} onChange={e => setCourtCount(e.target.value)} required style={{ width: '100%', padding: '0.42cqi', borderRadius: '0.21cqi', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.52cqi', marginTop: '0.52cqi' }}>
                <Button
                  onClick={() => setShowCreateModal(false)}
                  text="Cancel (取消)"
                  fontSize="0.77cqi"
                  angle={0}
                  icon={<XCircle size="0.83cqi" />}
                />
                <Button
                  type="submit"
                  text="Confirm (確認)"
                  fontSize="0.77cqi"
                  angle={120}
                  icon={<CheckCircle size="0.83cqi" />}
                />
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}

export default CourtSetup;