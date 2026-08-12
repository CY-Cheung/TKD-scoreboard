/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import MatchActionButtons from "./MatchActionButtons.jsx";

afterEach(cleanup);

function getActionButton(label) {
  const buttons = screen.getAllByRole("button");
  const match = buttons.find((btn) => within(btn).queryByText(label));
  if (!match) throw new Error(`button not found: ${label}`);
  return match;
}

describe("MatchActionButtons", () => {
  it("wires Add / Load / Home clicks", () => {
    const onAddMatch = vi.fn();
    const onLoadMatch = vi.fn();
    const onHome = vi.fn();

    render(
      <MatchActionButtons
        locale="en"
        localeVisible
        selectedMatchId="M1"
        onAddMatch={onAddMatch}
        onLoadMatch={onLoadMatch}
        onHome={onHome}
      />
    );

    fireEvent.click(getActionButton("Add Match"));
    fireEvent.click(screen.getByTestId("di-load-match"));
    fireEvent.click(getActionButton("Home"));

    expect(onAddMatch).toHaveBeenCalledTimes(1);
    expect(onLoadMatch).toHaveBeenCalledTimes(1);
    expect(onHome).toHaveBeenCalledTimes(1);
  });

  it("disables Load when no match selected", () => {
    render(
      <MatchActionButtons
        locale="en"
        localeVisible
        selectedMatchId={null}
        onAddMatch={vi.fn()}
        onLoadMatch={vi.fn()}
        onHome={vi.fn()}
      />
    );
    expect(screen.getByTestId("di-load-match").disabled).toBe(true);
  });
});
