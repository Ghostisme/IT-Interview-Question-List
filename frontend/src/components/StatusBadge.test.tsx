import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StatusBadge from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders the status text with underscores replaced", () => {
    render(<StatusBadge status="in_transit" />);
    expect(screen.getByText("in transit")).toBeInTheDocument();
  });

  it("applies emerald styles for completed status", () => {
    const { container } = render(<StatusBadge status="completed" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("bg-emerald-50");
  });

  it("applies blue styles for in_transit status", () => {
    const { container } = render(<StatusBadge status="in_transit" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("bg-blue-50");
  });

  it("applies amber styles for pending status", () => {
    const { container } = render(<StatusBadge status="pending" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("bg-amber-50");
  });

  it("falls back to slate for unknown status", () => {
    const { container } = render(<StatusBadge status="unknown_status" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("bg-slate-50");
    expect(screen.getByText("unknown status")).toBeInTheDocument();
  });
});
