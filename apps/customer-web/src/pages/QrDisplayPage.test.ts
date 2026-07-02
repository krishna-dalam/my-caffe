import { describe, expect, it } from "vitest";
import { buildCafeScanUrl, getQrPosterStatusText } from "./QrDisplayPage";

describe("QR display page", () => {
  it("builds the customer scan URL from origin and cafe slug", () => {
    expect(buildCafeScanUrl("https://dev.mycaffe.in/", "blue-bottle-demo")).toBe(
      "https://dev.mycaffe.in/c/blue-bottle-demo",
    );
  });

  it("encodes cafe slugs before rendering them into QR URLs", () => {
    expect(buildCafeScanUrl("https://dev.mycaffe.in", "demo cafe")).toBe("https://dev.mycaffe.in/c/demo%20cafe");
  });

  it("trims the configured web base URL before appending the customer route", () => {
    expect(buildCafeScanUrl("https://dev.mycaffe.in///", "indiranagar-cafe")).toBe(
      "https://dev.mycaffe.in/c/indiranagar-cafe",
    );
  });

  it("shows lifecycle status text for draft and inactive QR posters", () => {
    expect(getQrPosterStatusText("active")).toBeNull();
    expect(getQrPosterStatusText("draft")).toBe("Draft: This cafe is not accepting redemptions yet.");
    expect(getQrPosterStatusText("inactive")).toBe("Inactive: This cafe is currently inactive.");
  });
});
