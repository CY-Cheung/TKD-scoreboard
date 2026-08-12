import React from "react";
import { FolderPlus, Trash, CheckCircle } from "react-bootstrap-icons";
import Button from "../../Components/Button/Button";
import { StableLocaleText } from "../../Components/AlternatingLocale/AlternatingLocale";

/**
 * CourtSetup right-hand session form (event / password / court).
 */
export default function CourtSetupSessionForm({
  locale,
  visible,
  events,
  selectedEvent,
  setSelectedEvent,
  password,
  setPassword,
  courtId,
  setCourtId,
  courtOptions,
  error,
  onCreateEvent,
  onDeleteEvent,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="cs-form">
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
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          required
        >
          <option value="" disabled>
            {locale === "en"
              ? "-- Please select an event --"
              : "-- 請選擇賽事 --"}
          </option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.displayName || event.id}
            </option>
          ))}
        </select>

        <div className="cs-event-actions">
          <Button
            type="button"
            onClick={onCreateEvent}
            fontSize="1.05cqi"
            angle={120}
            icon={<FolderPlus size="1.1cqi" />}
            style={{
              flex: 1,
              whiteSpace: "nowrap",
              padding: "0.65cqi 0.9cqi",
            }}
          >
            <StableLocaleText
              as="span"
              locale={locale}
              visible={visible}
              en="Create Event"
              zh="新增賽事"
            />
          </Button>
          <Button
            type="button"
            onClick={onDeleteEvent}
            disabled={!selectedEvent}
            fontSize="1.05cqi"
            angle={350}
            icon={<Trash size="1.1cqi" />}
            style={{
              flex: 1,
              whiteSpace: "nowrap",
              padding: "0.65cqi 0.9cqi",
            }}
          >
            <StableLocaleText
              as="span"
              locale={locale}
              visible={visible}
              en="Delete Event"
              zh="刪除賽事"
            />
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
          placeholder={
            locale === "en" ? "Enter setup password" : "請輸入設定密碼"
          }
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
            value={courtId}
            onChange={(e) => setCourtId(e.target.value)}
            disabled={!selectedEvent || courtOptions.length === 0}
            required
          >
            <option value="" disabled>
              {locale === "en"
                ? "-- Please select a court --"
                : "-- 請選擇場地 --"}
            </option>
            {courtOptions.map((court) => (
              <option key={court} value={court}>
                {court}
              </option>
            ))}
          </select>
          <Button
            type="submit"
            fontSize="1.1cqi"
            angle={30}
            disabled={!selectedEvent || !courtId}
            icon={<CheckCircle size="1.15cqi" />}
            style={{
              whiteSpace: "nowrap",
              padding: "0.7cqi 1.35cqi",
              margin: 0,
              flex: 1,
            }}
          >
            <StableLocaleText
              as="span"
              locale={locale}
              visible={visible}
              en="Confirm Settings"
              zh="確認設定"
            />
          </Button>
        </div>
      </div>

      {error && <p className="cs-error-message">{error}</p>}
    </form>
  );
}
