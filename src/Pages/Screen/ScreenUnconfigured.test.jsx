/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ScreenUnconfigured from "./ScreenUnconfigured.jsx";

describe("ScreenUnconfigured", () => {
  it("prompts Court Setup", () => {
    render(<ScreenUnconfigured />);
    expect(screen.getByRole("heading", { name: /screen unconfigured/i })).toBeTruthy();
    expect(screen.getByText(/court setup/i)).toBeTruthy();
  });
});
