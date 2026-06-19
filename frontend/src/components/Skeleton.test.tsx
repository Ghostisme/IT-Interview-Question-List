import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SkeletonRow, SkeletonCard } from "./Skeleton";

describe("SkeletonRow", () => {
  it("renders the correct number of columns", () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonRow cols={4} />
        </tbody>
      </table>,
    );
    const cells = container.querySelectorAll("td");
    expect(cells).toHaveLength(4);
  });

  it("defaults to 5 columns", () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonRow />
        </tbody>
      </table>,
    );
    const cells = container.querySelectorAll("td");
    expect(cells).toHaveLength(5);
  });
});

describe("SkeletonCard", () => {
  it("renders without crashing", () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstElementChild).toBeTruthy();
    expect(container.firstElementChild!.className).toContain("animate-pulse");
  });
});
