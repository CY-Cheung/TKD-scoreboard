import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../../firebase';
import { ref, get, set, remove, update } from "firebase/database";
import { useAuth } from '../../Context/AuthContext';
import { useEventSession } from '../../Context/EventSessionContext';
import { FolderPlus, Trash, ExclamationTriangle, FileEarmarkPdf, FileEarmarkArrowUp, BoxArrowRight, CheckCircle, House, XCircle, Github, Key } from 'react-bootstrap-icons';
import { parseHktkdaPdfFile } from '../../Utils/pdfParser';
import { appendIvrQuotaToSettings } from '../../Api';
import { usePopup } from '../../Context/PopupContext';
import {
  buildCourtsMap,
  buildEventRecords,
  normalizeRulesFromForm,
} from '../../services/eventCreation';

import './CourtSetup.css';
import Button from '../../Components/Button/Button';
import { StableLocaleText, useAlternatingLocale } from '../../Components/AlternatingLocale/AlternatingLocale';
import { LANDING_FEATURES, LANDING_HERO } from '../../constants/landingFeatures';

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
  const [newIvrQuota, setNewIvrQuota] = useState('');
  const [courtCount, setCourtCount] = useState(4); // Default 4 courts

  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef(null);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfParseResult, setPdfParseResult] = useState(null);

  const navigate = useNavigate();
  const { user, userLoading, googleLogin, googleLogout } = useAuth();
  const { setEventSession, clearEventSession } = useEventSession();
  const { locale, visible } = useAlternatingLocale();
  const [signingIn, setSigningIn] = useState(false);

  // Reset event/court session when entering setup (e.g. from Home).
  // Must not clear Google auth — that would bounce us to Landing.
  useEffect(() => {
    clearEventSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setSigningIn(true);
    try {
      await googleLogin();
    } catch (err) {
      console.error('Google Sign-In Error:', err);
      setAuthError(`Login failed: ${err.message}`);
    } finally {
      setSigningIn(false);
    }
  };

  // Sign out Google then go to Landing — must clear user before navigate,
  // otherwise Landing auto-forwards signed-in users back to Court Setup.
  const handleGoogleLogout = async () => {
    try {
      await googleLogout();
    } catch (err) {
      console.error('Google logout error:', err);
    } finally {
      clearEventSession();
      navigate('/', { replace: true });
    }
  };

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
            return { id: key, displayName, createdBy: item?.createdBy || null, createdByEmail: item?.createdByEmail || null };
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

  if (userLoading) {
    return (
      <div className="cs-container aurora-bg">
        <div className="cs-content glass-card" style={{ padding: '3cqi', textAlign: 'center' }}>
          <p>Loading authentication state…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="cs-container aurora-bg">
        <div className="cs-content glass-card" style={{ padding: '3cqi', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2cqi' }}>
          <StableLocaleText
            as="p"
            locale={locale}
            visible={visible}
            en="Sign in with Google to set up a court."
            zh="請用 Google 登入以設置場地。"
          />
          <Button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            text={signingIn ? 'Signing in…' : 'Google (登入)'}
            icon={<Key size="1.4cqi" />}
            fontSize="1.2cqi"
            variant="gemini"
            style={{ padding: '0.9cqi 1.8cqi' }}
          />
          {authError && <p style={{ color: '#ff6b6b', margin: 0 }}>{authError}</p>}
          <Button
            onClick={() => navigate('/', { replace: true })}
            text="Back (返回)"
            fontSize="1cqi"
            variant="gray"
            style={{ padding: '0.6cqi 1.2cqi' }}
          />
        </div>
      </div>
    );
  }

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

    try {
      const formRules = normalizeRulesFromForm({
        maxPointGap: newMaxPointGap,
        maxGamjeom: newMaxGamjeom,
        roundDuration: newRoundDuration,
        restDuration: newRestDuration,
      });
      const { courts, count } = buildCourtsMap(courtCount);
      const settings = appendIvrQuotaToSettings(
        { setupPassword: newSetupPassword, ...formRules },
        newIvrQuota
      );

      const { records, primaryEventId, mode, datesCount } = buildEventRecords({
        eventId: trimmedId,
        eventName: trimmedName,
        user,
        settings,
        courts,
        courtCount: count,
        pdfParseResult,
      });

      for (const record of records) {
        await set(ref(database, `events/${record.id}`), record.data);
      }

      if (mode === 'multi') {
        showToast(`✅ 成功按 ${datesCount} 個比賽日期拆分並建立 ${records.length} 個子賽事！`);
      } else if (mode === 'single-pdf') {
        showToast(`✅ 成功建立賽事並匯入賽程：${trimmedName}`);
      } else {
        showToast(`✅ 成功建立賽事：${trimmedName} (${trimmedId})，包含 ${count} 個場地！`);
      }
      setSelectedEvent(primaryEventId);

      setNewEventId('');
      setNewEventName('');
      setNewSetupPassword('');
      setNewMaxPointGap(15);
      setNewMaxGamjeom(5);
      setNewRoundDuration(90);
      setNewRestDuration(60);
      setNewIvrQuota('');
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

    if (!password.trim()) {
      setError('Please enter setup password.');
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

      setEventSession({
        eventId: selectedEvent,
        courtId: courtId,
        eventName: eventDisplayName
      });

      navigate('/home');
    };

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
            onClick={handleGoogleLogout}
            title="Sign Out of Google Account & Return to Landing"
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
            <StableLocaleText
              as="h1"
              locale={locale}
              visible={visible}
              className="cs-hero-title"
              en={LANDING_HERO.titleEn}
              zh={LANDING_HERO.titleZh}
            />
            <StableLocaleText
              as="p"
              locale={locale}
              visible={visible}
              className="cs-subtitle"
              en={LANDING_HERO.subtitleEn}
              zh={LANDING_HERO.subtitleZh}
            />
            <ul className="cs-app-intro-list">
              {LANDING_FEATURES.map(({ id, titleEn, titleZh, en, zh }) => (
                <li key={id} className="cs-app-intro-item">
                  <StableLocaleText
                    as="div"
                    locale={locale}
                    visible={visible}
                    className="cs-app-intro-title"
                    en={titleEn}
                    zh={titleZh}
                  />
                  <StableLocaleText
                    as="div"
                    locale={locale}
                    visible={visible}
                    className="cs-app-intro-desc"
                    en={en}
                    zh={zh}
                  />
                </li>
              ))}
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
            <form onSubmit={handleSubmit} className="cs-form">
              <div className="form-group">
                <StableLocaleText
                  as="label"
                  htmlFor="event-select"
                  locale={locale}
                  visible={visible}
                  className="cs-form-label"
                  en="Select Event"
                  zh="選擇賽事"
                />

                <select
                  id="event-select"
                  className="datalist-input"
                  style={{ padding: '0 0.62cqi', fontSize: '0.85cqi', height: '2.34cqi', boxSizing: 'border-box', width: '100%' }}
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    {locale === 'en' ? '-- Please select an event --' : '-- 請選擇賽事 --'}
                  </option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.displayName || event.id}
                    </option>
                  ))}
                </select>

                <div style={{ display: 'flex', gap: '0.52cqi', marginTop: '0.52cqi' }}>
                  <Button type="button" onClick={() => setShowCreateModal(true)} fontSize="0.77cqi" angle={120} icon={<FolderPlus size="0.83cqi" />} style={{ flex: 1, whiteSpace: 'nowrap' }}>
                    <StableLocaleText as="span" locale={locale} visible={visible} en="Create Event" zh="新增賽事" />
                  </Button>
                  <Button type="button" onClick={promptDeleteEvent} disabled={!selectedEvent} fontSize="0.77cqi" angle={350} icon={<Trash size="0.83cqi" />} style={{ flex: 1, whiteSpace: 'nowrap' }}>
                    <StableLocaleText as="span" locale={locale} visible={visible} en="Delete Event" zh="刪除賽事" />
                  </Button>
                </div>
              </div>

              <div className="form-group">
                <StableLocaleText
                  as="label"
                  htmlFor="setup-password"
                  locale={locale}
                  visible={visible}
                  className="cs-form-label"
                  en="Setup Password"
                  zh="設定密碼"
                />
                <input
                  id="setup-password"
                  type="password"
                  className="datalist-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={locale === 'en' ? 'Enter setup password' : '請輸入設定密碼'}
                  required
                />
              </div>

              <div className="form-group">
                <StableLocaleText
                  as="label"
                  htmlFor="court-select"
                  locale={locale}
                  visible={visible}
                  className="cs-form-label"
                  en="Select Court"
                  zh="選擇場地"
                />
                <div className="cs-court-confirm-row">
                  <select
                    id="court-select"
                    className="datalist-input cs-court-select"
                    style={{ padding: '0 0.62cqi', fontSize: '0.85cqi', height: '2.34cqi', boxSizing: 'border-box' }}
                    value={courtId}
                    onChange={(e) => setCourtId(e.target.value)}
                    disabled={!selectedEvent || courtOptions.length === 0}
                    required
                  >
                    <option value="" disabled>
                      {locale === 'en' ? '-- Please select a court --' : '-- 請選擇場地 --'}
                    </option>
                    {courtOptions.map(court => (
                      <option key={court} value={court}>{court}</option>
                    ))}
                  </select>
                  <Button type="submit" fontSize="0.85cqi" angle={30} disabled={!selectedEvent || !courtId} icon={<CheckCircle size="0.83cqi" />} style={{ whiteSpace: 'nowrap', padding: '0.52cqi 1.2cqi', margin: 0, flex: 1 }}>
                    <StableLocaleText as="span" locale={locale} visible={visible} en="Confirm Settings" zh="確認設定" />
                  </Button>
                </div>
              </div>

              {error && <p className="cs-error-message">{error}</p>}
            </form>
        </div>
      </div>

      {/* --- Create Event Modal Overlay --- */}
      {showCreateModal && (
        <div className="cs-create-modal-overlay">
          <div className="cs-create-modal">
            <h3 className="cs-create-modal-title">
              <FolderPlus size="1.25cqi" />
              <StableLocaleText
                as="span"
                locale={locale}
                visible={visible}
                en="Create Event"
                zh="建立新賽事"
              />
            </h3>
            <form onSubmit={handleCreateEvent} className="cs-create-modal-form">
              <div className="cs-create-modal-pdf">
                <div className="cs-create-modal-pdf-head">
                  <FileEarmarkPdf size="1.25cqi" color="#34c759" />
                  <StableLocaleText
                    as="span"
                    locale={locale}
                    visible={visible}
                    className="cs-create-modal-pdf-title"
                    en="Upload PDF (Optional)"
                    zh="上傳 PDF 自動建立（選填）"
                  />
                </div>
                <StableLocaleText
                  as="p"
                  locale={locale}
                  visible={visible}
                  className="cs-create-modal-pdf-desc"
                  en="Upload a bracket PDF to auto-fill the event name and import athletes. Multi-day events are split into sub-events automatically."
                  zh="上傳對陣表即可自動填充賽事名稱及匯入所有選手資料。如比賽橫跨多日，系統將自動分拆為多個子賽事。"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  className="cs-create-modal-pdf-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsingPdf}
                  fontSize="0.77cqi"
                  angle={60}
                  icon={<FileEarmarkArrowUp size="0.83cqi" />}
                  style={{ padding: '0.42cqi 0.9cqi', margin: 0 }}
                >
                  <StableLocaleText
                    as="span"
                    locale={locale}
                    visible={visible}
                    en={isParsingPdf ? 'Parsing…' : 'Select PDF'}
                    zh={isParsingPdf ? '解析中…' : '選擇 PDF'}
                  />
                </Button>
                {pdfParseResult && (
                  <StableLocaleText
                    as="div"
                    locale={locale}
                    visible={visible}
                    className="cs-create-modal-pdf-success"
                    en={`✅ Parsed: ${pdfParseResult.matchCount} matches${pdfParseResult.datesList?.length > 1 ? ` (${pdfParseResult.datesList.length} dates — will split into multiple events)` : ''}`}
                    zh={`✅ 成功解析：${pdfParseResult.matchCount} 場比賽${pdfParseResult.datesList?.length > 1 ? `（包含 ${pdfParseResult.datesList.length} 個日期，將自動分拆為多個賽事）` : ''}`}
                  />
                )}
              </div>
              <div className="cs-create-modal-grid cs-create-modal-grid--wide">
                <div className="form-group cs-create-modal-field">
                  <StableLocaleText as="label" locale={locale} visible={visible} className="cs-create-modal-label" en="Event ID" zh="賽事識別碼" />
                  <input
                    type="text"
                    placeholder={locale === 'en' ? 'e.g. TKD2026 (unique)' : '例如: TKD2026（不可重複）'}
                    value={newEventId}
                    onChange={e => setNewEventId(e.target.value)}
                    required
                    className="cs-create-modal-input"
                  />
                </div>
                <div className="form-group cs-create-modal-field">
                  <StableLocaleText as="label" locale={locale} visible={visible} className="cs-create-modal-label" en="Event Name" zh="賽事全稱" />
                  <input
                    type="text"
                    placeholder={locale === 'en' ? 'e.g. 2026 Hong Kong Taekwondo Championships' : '例如: 2026 全港跆拳道錦標賽'}
                    value={newEventName}
                    onChange={e => setNewEventName(e.target.value)}
                    required
                    className="cs-create-modal-input"
                  />
                </div>
                <div className="form-group cs-create-modal-field">
                  <StableLocaleText as="label" locale={locale} visible={visible} className="cs-create-modal-label" en="Setup Password" zh="設定密碼" />
                  <input
                    type="text"
                    placeholder={locale === 'en' ? 'e.g. BCB2026' : '例如: BCB2026'}
                    value={newSetupPassword}
                    onChange={e => setNewSetupPassword(e.target.value)}
                    required
                    className="cs-create-modal-input"
                  />
                </div>
              </div>
              <div className="cs-create-modal-grid cs-create-modal-grid--pair">
                <div className="form-group cs-create-modal-field">
                  <StableLocaleText as="label" locale={locale} visible={visible} className="cs-create-modal-label" en="Round Duration (sec)" zh="回合秒數" />
                  <input type="number" value={newRoundDuration} onChange={e => setNewRoundDuration(e.target.value)} className="cs-create-modal-input" />
                </div>
                <div className="form-group cs-create-modal-field">
                  <StableLocaleText as="label" locale={locale} visible={visible} className="cs-create-modal-label" en="Rest Duration (sec)" zh="休息秒數" />
                  <input type="number" value={newRestDuration} onChange={e => setNewRestDuration(e.target.value)} className="cs-create-modal-input" />
                </div>
              </div>
              <div className="cs-create-modal-grid cs-create-modal-grid--quad">
                <div className="form-group cs-create-modal-field">
                  <StableLocaleText as="label" locale={locale} visible={visible} className="cs-create-modal-label" en="Point Gap" zh="分差" />
                  <input type="number" value={newMaxPointGap} onChange={e => setNewMaxPointGap(e.target.value)} className="cs-create-modal-input" />
                </div>
                <div className="form-group cs-create-modal-field">
                  <StableLocaleText as="label" locale={locale} visible={visible} className="cs-create-modal-label" en="Max Gam-jeom" zh="犯規上限" />
                  <input type="number" value={newMaxGamjeom} onChange={e => setNewMaxGamjeom(e.target.value)} className="cs-create-modal-input" />
                </div>
                <div className="form-group cs-create-modal-field">
                  <StableLocaleText as="label" locale={locale} visible={visible} className="cs-create-modal-label" en="IVR Quota" zh="IVR 配額" />
                  <input type="number" min="1" placeholder={locale === 'en' ? 'Empty = unlimited' : '留空 = 無限'} value={newIvrQuota} onChange={e => setNewIvrQuota(e.target.value)} className="cs-create-modal-input" />
                </div>
                <div className="form-group cs-create-modal-field">
                  <StableLocaleText as="label" locale={locale} visible={visible} className="cs-create-modal-label" en="Number of Courts" zh="場地數量" />
                  <input type="number" min="1" max="12" placeholder={locale === 'en' ? '1–12' : '1–12'} value={courtCount} onChange={e => setCourtCount(e.target.value)} required className="cs-create-modal-input" />
                </div>
              </div>
              <div className="cs-create-modal-actions">
                <Button
                  onClick={() => setShowCreateModal(false)}
                  fontSize="0.77cqi"
                  angle={0}
                  icon={<XCircle size="0.83cqi" />}
                >
                  <StableLocaleText as="span" locale={locale} visible={visible} en="Cancel" zh="取消" />
                </Button>
                <Button
                  type="submit"
                  fontSize="0.77cqi"
                  angle={120}
                  icon={<CheckCircle size="0.83cqi" />}
                >
                  <StableLocaleText as="span" locale={locale} visible={visible} en="Confirm" zh="確認" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}

export default CourtSetup;