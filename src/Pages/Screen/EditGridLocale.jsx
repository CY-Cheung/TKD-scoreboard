import React from "react";

/**
 * Dual-layer locale for Edit grid: width stays max(EN, ZH)
 * so columns don't shift on fade.
 */
function EditGridLocale({ en, zh, locale, visible, className = "" }) {
  const enActive = locale === "en" && visible;
  const zhActive = locale === "zh" && visible;
  return (
    <span className={`edit-grid-locale${className ? ` ${className}` : ""}`}>
      <span
        className={`edit-grid-locale-layer${enActive ? " is-visible" : ""}`}
        lang="en"
        aria-hidden={!enActive}
      >
        {en}
      </span>
      <span
        className={`edit-grid-locale-layer${zhActive ? " is-visible" : ""}`}
        lang="zh-Hant"
        aria-hidden={!zhActive}
      >
        {zh}
      </span>
    </span>
  );
}

export default EditGridLocale;
