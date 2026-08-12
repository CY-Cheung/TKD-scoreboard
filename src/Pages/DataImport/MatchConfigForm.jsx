import React from "react";
import { StableLocaleText } from "../../Components/AlternatingLocale/AlternatingLocale";

/**
 * Presentational match config + competitor fields for DataImport.
 * Submit / load actions stay in the page action row.
 */
export default function MatchConfigForm({
  locale,
  localeVisible,
  currentMatches,
  matchId,
  setMatchId,
  nextMatchId,
  setNextMatchId,
  nextMatchSlot,
  setNextMatchSlot,
  roundDuration,
  setRoundDuration,
  restDuration,
  setRestDuration,
  maxPointGap,
  setMaxPointGap,
  maxGamjeom,
  setMaxGamjeom,
  ivrQuota,
  setIvrQuota,
  blueName,
  setBlueName,
  blueAffiliatedClub,
  setBlueAffiliatedClub,
  bluePreviousMatch,
  setBluePreviousMatch,
  redName,
  setRedName,
  redAffiliatedClub,
  setRedAffiliatedClub,
  redPreviousMatch,
  setRedPreviousMatch,
}) {
  return (
    <div className="match-form">
      <fieldset>
        <legend>
          <StableLocaleText
            as="span"
            locale={locale}
            visible={localeVisible}
            en="Match Configuration"
            zh="比賽設定"
          />
        </legend>
        <div className="di-config-rows">
          <div className="fieldset-content">
            <div className="form-group">
              <StableLocaleText
                as="label"
                locale={locale}
                visible={localeVisible}
                className="di-field-label"
                en="Match ID"
                zh="比賽編號"
              />
              <input
                list="match-ids"
                type="text"
                value={matchId}
                onChange={(e) => setMatchId(e.target.value)}
                placeholder="A1001"
              />
              <datalist id="match-ids">
                {Object.keys(currentMatches).map((mId) => (
                  <option key={mId} value={mId} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <StableLocaleText
                as="label"
                locale={locale}
                visible={localeVisible}
                className="di-field-label"
                en="Next Match ID"
                zh="下一場比賽編號"
              />
              <input
                type="text"
                value={nextMatchId}
                onChange={(e) => setNextMatchId(e.target.value)}
                placeholder={
                  locale === "en" ? "e.g. A2001 (optional)" : "例如: A2001（選填）"
                }
              />
            </div>
            <div className="form-group">
              <StableLocaleText
                as="label"
                locale={locale}
                visible={localeVisible}
                className="di-field-label"
                en="Next Match Slot"
                zh="下一場席位"
              />
              <select
                value={nextMatchSlot || ""}
                onChange={(e) => setNextMatchSlot(e.target.value)}
              >
                <option value="">
                  {locale === "en" ? "(optional)" : "（選填）"}
                </option>
                <option value="blue">
                  {locale === "en" ? "Blue" : "藍方"}
                </option>
                <option value="red">
                  {locale === "en" ? "Red" : "紅方"}
                </option>
              </select>
            </div>
          </div>
          <div className="fieldset-content">
            <div className="form-group">
              <StableLocaleText
                as="label"
                locale={locale}
                visible={localeVisible}
                className="di-field-label"
                en="Round Duration (sec)"
                zh="回合秒數"
              />
              <input
                type="number"
                value={roundDuration}
                onChange={(e) => setRoundDuration(e.target.value)}
              />
            </div>
            <div className="form-group">
              <StableLocaleText
                as="label"
                locale={locale}
                visible={localeVisible}
                className="di-field-label"
                en="Rest Duration (sec)"
                zh="休息秒數"
              />
              <input
                type="number"
                value={restDuration}
                onChange={(e) => setRestDuration(e.target.value)}
              />
            </div>
          </div>
          <div className="fieldset-content">
            <div className="form-group">
              <StableLocaleText
                as="label"
                locale={locale}
                visible={localeVisible}
                className="di-field-label"
                en="Point Gap"
                zh="分差"
              />
              <input
                type="number"
                value={maxPointGap}
                onChange={(e) => setMaxPointGap(e.target.value)}
              />
            </div>
            <div className="form-group">
              <StableLocaleText
                as="label"
                locale={locale}
                visible={localeVisible}
                className="di-field-label"
                en="Max Gam-jeom"
                zh="犯規上限"
              />
              <input
                type="number"
                value={maxGamjeom}
                onChange={(e) => setMaxGamjeom(e.target.value)}
              />
            </div>
            <div className="form-group">
              <StableLocaleText
                as="label"
                locale={locale}
                visible={localeVisible}
                className="di-field-label"
                en="IVR Quota"
                zh="IVR 配額"
              />
              <input
                type="number"
                min="1"
                placeholder={
                  locale === "en" ? "Empty = unlimited" : "留空 = 無限"
                }
                value={ivrQuota}
                onChange={(e) => setIvrQuota(e.target.value)}
              />
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className="competitor-group blue">
        <legend>
          <StableLocaleText
            as="span"
            locale={locale}
            visible={localeVisible}
            en="Blue Competitor"
            zh="藍方選手"
          />
        </legend>
        <div className="fieldset-content">
          <div className="form-group">
            <StableLocaleText
              as="label"
              locale={locale}
              visible={localeVisible}
              className="di-field-label"
              en="Name"
              zh="姓名"
            />
            <input
              type="text"
              value={blueName}
              onChange={(e) => setBlueName(e.target.value)}
              placeholder={
                locale === "en" ? "Blue player name" : "藍方選手姓名"
              }
            />
          </div>
          <div className="form-group">
            <StableLocaleText
              as="label"
              locale={locale}
              visible={localeVisible}
              className="di-field-label"
              en="Affiliated Club"
              zh="屬會"
            />
            <input
              type="text"
              value={blueAffiliatedClub}
              onChange={(e) => setBlueAffiliatedClub(e.target.value)}
              placeholder={
                locale === "en" ? "Club (optional)" : "屬會（選填）"
              }
            />
          </div>
          <div className="form-group">
            <StableLocaleText
              as="label"
              locale={locale}
              visible={localeVisible}
              className="di-field-label"
              en="Source Match ID"
              zh="來源比賽編號"
            />
            <input
              type="text"
              value={bluePreviousMatch}
              onChange={(e) => setBluePreviousMatch(e.target.value)}
              placeholder={
                locale === "en"
                  ? "Source match (optional)"
                  : "來源比賽（選填）"
              }
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="competitor-group red">
        <legend>
          <StableLocaleText
            as="span"
            locale={locale}
            visible={localeVisible}
            en="Red Competitor"
            zh="紅方選手"
          />
        </legend>
        <div className="fieldset-content">
          <div className="form-group">
            <StableLocaleText
              as="label"
              locale={locale}
              visible={localeVisible}
              className="di-field-label"
              en="Name"
              zh="姓名"
            />
            <input
              type="text"
              value={redName}
              onChange={(e) => setRedName(e.target.value)}
              placeholder={
                locale === "en" ? "Red player name" : "紅方選手姓名"
              }
            />
          </div>
          <div className="form-group">
            <StableLocaleText
              as="label"
              locale={locale}
              visible={localeVisible}
              className="di-field-label"
              en="Affiliated Club"
              zh="屬會"
            />
            <input
              type="text"
              value={redAffiliatedClub}
              onChange={(e) => setRedAffiliatedClub(e.target.value)}
              placeholder={
                locale === "en" ? "Club (optional)" : "屬會（選填）"
              }
            />
          </div>
          <div className="form-group">
            <StableLocaleText
              as="label"
              locale={locale}
              visible={localeVisible}
              className="di-field-label"
              en="Source Match ID"
              zh="來源比賽編號"
            />
            <input
              type="text"
              value={redPreviousMatch}
              onChange={(e) => setRedPreviousMatch(e.target.value)}
              placeholder={
                locale === "en"
                  ? "Source match (optional)"
                  : "來源比賽（選填）"
              }
            />
          </div>
        </div>
      </fieldset>
    </div>
  );
}
