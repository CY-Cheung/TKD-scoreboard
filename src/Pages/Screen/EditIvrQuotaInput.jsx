import React from "react";

/** Numeric IVR quota field for one side. */
export default function EditIvrQuotaInput({
  side,
  value,
  disabled,
  onChange,
  onFocus,
  onBlur,
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      className="edit-ivr-quota-input"
      value={value}
      onChange={(e) => onChange(side, e.target.value)}
      onFocus={() => onFocus(side)}
      onBlur={() => onBlur(side)}
      disabled={disabled}
      aria-label={`${side} IVR quota`}
    />
  );
}
