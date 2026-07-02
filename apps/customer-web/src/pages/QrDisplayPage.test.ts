import { describe, expect, it } from "vitest";
import { buildCafeScanUrl } from "./QrDisplayPage";

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
});
