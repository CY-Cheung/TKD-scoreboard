import React from "react";
import { BoxArrowRight } from "react-bootstrap-icons";
import Button from "../Button/Button";

/**
 * Shared bottom-right Google user badge + logout (Home + CourtSetup).
 */
export default function BrandSplitUserBadge({ user, onLogout }) {
  if (!user) return null;

  return (
    <div className="brand-split-user-badge">
      <div style={{ display: "flex", alignItems: "center", gap: "0.52cqi" }}>
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt="User Avatar"
            style={{
              width: "1.66cqi",
              height: "1.66cqi",
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: "1.66cqi",
              height: "1.66cqi",
              borderRadius: "50%",
              backgroundColor: "#6c5ce7",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "0.85cqi",
            }}
          >
            {user.displayName?.[0] || "U"}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "white",
              fontWeight: "bold",
              fontSize: "0.77cqi",
              lineHeight: "1.2",
            }}
          >
            {user.displayName || "User"}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.64cqi",
              lineHeight: "1.2",
            }}
          >
            {user.email}
          </div>
        </div>
      </div>
      <Button
        onClick={onLogout}
        title="Sign Out of Google Account & Return to Landing"
        fontSize="0.72cqi"
        variant="orange"
        icon={<BoxArrowRight size="0.73cqi" />}
        text="Logout (登出)"
        style={{ padding: "0.31cqi 0.62cqi", minWidth: "auto", margin: 0 }}
      />
    </div>
  );
}
