import React from "react";
import { FilePlayFill, FileFontFill } from "react-bootstrap-icons";
import EditGridLocale from "./EditGridLocale";
import { EDIT_POINT_TYPES } from "./editPointTypes";

/** Header row for Edit scoring grid (IVR / Technical / point types). */
export default function EditGridHeaders({ locale, localeVisible }) {
  return (
    <>
      <div className="grid-cell header"></div>
      <div className="grid-cell header">
        <FilePlayFill
          size="1.3cqi"
          color="white"
          style={{ marginRight: "0.4cqi", flexShrink: 0 }}
        />
        <EditGridLocale
          locale={locale}
          visible={localeVisible}
          en="IVR"
          zh="IVR"
        />
      </div>
      <div className="grid-cell header">
        <FileFontFill
          size="1.3cqi"
          color="white"
          style={{ marginRight: "0.4cqi", flexShrink: 0 }}
        />
        <EditGridLocale
          locale={locale}
          visible={localeVisible}
          en="Technical"
          zh="技術卡"
        />
      </div>
      {EDIT_POINT_TYPES.map((pt) => (
        <div className="grid-cell header" key={pt.id}>
          {pt.icon && (
            <pt.icon
              size={pt.iconSize || "1.3cqi"}
              style={{
                marginRight: pt.secondIcon ? "0.1cqi" : "0.4cqi",
                color: "white",
                flexShrink: 0,
              }}
            />
          )}
          {pt.secondIcon && (
            <pt.secondIcon
              size={pt.iconSize || "1.3cqi"}
              style={{ marginRight: "0.4cqi", color: "white", flexShrink: 0 }}
            />
          )}
          <EditGridLocale
            locale={locale}
            visible={localeVisible}
            en={pt.nameEn}
            zh={pt.nameZh}
          />
        </div>
      ))}
    </>
  );
}
