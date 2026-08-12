/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BrandSplitUserBadge from "./BrandSplitUserBadge.jsx";

describe("BrandSplitUserBadge", () => {
  it("renders nothing without user", () => {
    const { container } = render(
      <BrandSplitUserBadge user={null} onLogout={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows name/email and logout", () => {
    const onLogout = vi.fn();
    render(
      <BrandSplitUserBadge
        user={{ displayName: "Ada", email: "ada@example.com" }}
        onLogout={onLogout}
      />
    );
    expect(screen.getByText("Ada")).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    fireEvent.click(screen.getByText(/Logout/));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
