import React from "react";
import BrandSplitHero from "./BrandSplitHero";
import BrandSplitUserBadge from "./BrandSplitUserBadge";
import "./BrandSplit.css";

/**
 * Shared split card: left brand hero + divider + right slot.
 * Pages only render the right-hand children.
 *
 * @param {"home"|"court"} rightVariant — padding density for right slot
 */
export default function BrandSplitLayout({
  locale,
  visible,
  user,
  onLogout,
  rightVariant = "home",
  children,
  className = "",
}) {
  const rightClass =
    rightVariant === "court"
      ? "brand-split-right brand-split-right--court"
      : "brand-split-right brand-split-right--home";

  return (
    <div
      className={`brand-split-content glass-card split-layout ${className}`.trim()}
    >
      <BrandSplitUserBadge user={user} onLogout={onLogout} />
      <BrandSplitHero locale={locale} visible={visible} />
      <div className="brand-split-divider" />
      <div className={rightClass}>{children}</div>
    </div>
  );
}
