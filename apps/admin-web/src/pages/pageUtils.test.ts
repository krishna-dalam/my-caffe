import { describe, expect, it } from "vitest";
import { statusLabel } from "./pageUtils";

describe("pageUtils", () => {
  it("formats cafe statuses for display", () => {
    expect(statusLabel("draft")).toBe("Draft");
    expect(statusLabel("active")).toBe("Active");
    expect(statusLabel("inactive")).toBe("Inactive");
  });
});

