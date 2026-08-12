import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { database } from '../../firebase';
import { ref, get, remove } from "firebase/database";
import { useAuth } from '../../Context/AuthContext';
import { useEventSession } from '../../Context/EventSessionContext';
import { usePopup } from '../../Context/PopupContext';
import {
  fetchEventList,
  removeEventIndexEntry,
} from '../../services/eventIndexFirebase';
import {
  fetchCourtIds,
  removeFlatCourtsForEvent,
  updateCourtField,
} from '../../services/courtFirebase';
import {
  removeMatchFlatArtifactsForEvent,
} from '../../services/matchFirebase';

import './CourtSetup.css';
import { useAlternatingLocale } from '../../Components/AlternatingLocale/AlternatingLocale';
import CreateEventModal from './CreateEventModal';
import CourtSetupSessionForm from './CourtSetupSessionForm';
import BrandSplitLayout from '../../Components/BrandSplit/BrandSplitLayout';
import { runPdfFileSelect } from '../../services/pdfImportFlow';
import {
  persistCreatedEvents,
  toastMessageForCreateMode,
  defaultCreateEventFormValues,
} from '../../services/persistCreatedEvents';
import {
  resolveSelectedEventId,
  resolveCourtIdFromOptions,
  canUserDeleteEvent,
  validateCourtSetupLogin,
  applyCreateEventFormReset,
} from './courtSetupHelpers';
import { toggleDoubleClickFullscreen } from '../../Utils/requestFullscreen';

function CourtSetup() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [courtId, setCourtId] = useState('');
  const [courtOptions, setCourtOptions] = useState([]);
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
  const { user, userLoading, googleLogout } = useAuth();
  const { setEventSession, clearEventSession } = useEventSession();
  const { locale, visible } = useAlternatingLocale();

  // Reset event/court session when entering setup (e.g. from Home).
  // Must not clear Google auth — that would bounce us to Landing.
  useEffect(() => {
    clearEventSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Load events from Firebase (prefer light eventIndex)
  const fetchEvents = () => {
    if (!user) return;
    setError('');

    fetchEventList(database)
      .then((eventList) => {
        setEvents(eventList);
        const lastEvent = sessionStorage.getItem('selectedEvent');
        setSelectedEvent((current) =>
          resolveSelectedEventId(eventList, current, lastEvent)
        );
      })
      .catch((err) => {
        console.error("Error fetching events:", err);
        setError("Failed to fetch events from database. Please check your network or login.");
      });
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  useEffect(() => {
    if (selectedEvent && user) {
      fetchCourtIds(database, selectedEvent).then((ids) => {
        setCourtOptions(ids);
        const lastCourt = sessionStorage.getItem('selectedCourt');
        setCourtId(resolveCourtIdFromOptions(ids, lastCourt));
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

  // Google sign-in lives on Landing only — never show a Court Setup login wall.
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // PDF File Upload Handler
  const handleFileSelect = async (e) => {
    await runPdfFileSelect(e.target.files?.[0], {
      showToast,
      setIsParsingPdf,
      setPdfParseResult,
      setNewEventName,
      newEventId,
      setNewEventId,
      fileInputRef,
    });
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
      const { records, primaryEventId, mode, datesCount, courtCountUsed } =
        await persistCreatedEvents({
          database,
          user,
          eventId: trimmedId,
          eventName: trimmedName,
          setupPassword: newSetupPassword,
          formRulesFields: {
            maxPointGap: newMaxPointGap,
            maxGamjeom: newMaxGamjeom,
            roundDuration: newRoundDuration,
            restDuration: newRestDuration,
          },
          ivrQuota: newIvrQuota,
          courtCount,
          pdfParseResult,
        });

      showToast(
        toastMessageForCreateMode(mode, {
          trimmedName,
          trimmedId,
          datesCount,
          recordsLength: records.length,
          courtCount: courtCountUsed,
          includeCourtCountOnBare: true,
        })
      );
      setSelectedEvent(primaryEventId);

      applyCreateEventFormReset(defaultCreateEventFormValues(), {
        setNewEventId,
        setNewEventName,
        setNewSetupPassword,
        setNewMaxPointGap,
        setNewMaxGamjeom,
        setNewRoundDuration,
        setNewRestDuration,
        setNewIvrQuota,
        setPdfParseResult,
      });
      setCourtCount(4);
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
    if (!canUserDeleteEvent(eventData, user.email)) {
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
      try {
        await removeEventIndexEntry(database, selectedEvent);
      } catch (indexErr) {
        console.warn('eventIndex remove before delete:', indexErr);
      }
      try {
        await removeFlatCourtsForEvent(database, selectedEvent);
      } catch (courtsErr) {
        console.warn('flat courts remove before delete:', courtsErr);
      }
      try {
        await removeMatchFlatArtifactsForEvent(database, selectedEvent);
      } catch (matchFlatErr) {
        console.warn('flat match trees remove before delete:', matchFlatErr);
      }
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

    const validationError = validateCourtSetupLogin({
      selectedEvent,
      courtId,
      password,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    const performLogin = async () => {
      // Ensure court name exists without clobbering currentMatchId
      await updateCourtField(database, selectedEvent, courtId, [], {
        name: courtId,
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

  return (
    <div className="cs-container aurora-bg" onDoubleClick={toggleDoubleClickFullscreen}>
      <BrandSplitLayout
        locale={locale}
        visible={visible}
        user={user}
        onLogout={handleGoogleLogout}
        rightVariant="court"
        className="cs-content"
      >
        <CourtSetupSessionForm
          locale={locale}
          visible={visible}
          events={events}
          selectedEvent={selectedEvent}
          setSelectedEvent={setSelectedEvent}
          password={password}
          setPassword={setPassword}
          courtId={courtId}
          setCourtId={setCourtId}
          courtOptions={courtOptions}
          error={error}
          onCreateEvent={() => setShowCreateModal(true)}
          onDeleteEvent={promptDeleteEvent}
          onSubmit={handleSubmit}
        />
      </BrandSplitLayout>

      {showCreateModal && (
        <CreateEventModal
          locale={locale}
          visible={visible}
          fileInputRef={fileInputRef}
          isParsingPdf={isParsingPdf}
          pdfParseResult={pdfParseResult}
          newEventId={newEventId}
          setNewEventId={setNewEventId}
          newEventName={newEventName}
          setNewEventName={setNewEventName}
          newSetupPassword={newSetupPassword}
          setNewSetupPassword={setNewSetupPassword}
          newRoundDuration={newRoundDuration}
          setNewRoundDuration={setNewRoundDuration}
          newRestDuration={newRestDuration}
          setNewRestDuration={setNewRestDuration}
          newMaxPointGap={newMaxPointGap}
          setNewMaxPointGap={setNewMaxPointGap}
          newMaxGamjeom={newMaxGamjeom}
          setNewMaxGamjeom={setNewMaxGamjeom}
          newIvrQuota={newIvrQuota}
          setNewIvrQuota={setNewIvrQuota}
          courtCount={courtCount}
          setCourtCount={setCourtCount}
          onFileSelect={handleFileSelect}
          onSubmit={handleCreateEvent}
          onCancel={() => setShowCreateModal(false)}
        />
      )}


    </div>
  );
}

export default CourtSetup;