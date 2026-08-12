/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  ControllerConnectingScreen,
  ControllerSeatGrabErrorScreen,
  ControllerCourtFullScreen,
} from "./ControllerStatusScreens.jsx";

afterEach(cleanup);

describe("ControllerStatusScreens", () => {
  it("shows connecting copy", () => {
    render(<ControllerConnectingScreen />);
    expect(screen.getByText(/Connecting/i)).toBeTruthy();
    expect(screen.getByText(/J1–J3/)).toBeTruthy();
  });

  it("shows seat grab error and retry", () => {
    const onRetry = vi.fn();
    render(
      <ControllerSeatGrabErrorScreen error="PERMISSION_DENIED" onRetry={onRetry} />
    );
    expect(screen.getByText("PERMISSION_DENIED")).toBeTruthy();
    fireEvent.click(screen.getByText(/Retry/));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows court full and back", () => {
    const onBack = vi.fn();
    render(<ControllerCourtFullScreen onBack={onBack} />);
    expect(screen.getByText(/Court is Full/i)).toBeTruthy();
    fireEvent.click(screen.getByText(/Back/));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
