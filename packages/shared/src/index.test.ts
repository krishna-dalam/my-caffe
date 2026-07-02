import { describe, expect, it } from "vitest";
import {
  buildCafeQrDisplayUrl,
  buildCustomerRedeemUrl,
  generateCafeSlug,
  isCafeActive,
  normalizeCafeName,
  validateCreateCafeInput,
  validateUpdateCafeInput,
} from "./index.js";

describe("cafe onboarding helpers", () => {
  it("normalizes cafe names", () => {
    expect(normalizeCafeName("  Blue   Bottle   Cafe  ")).toBe("Blue Bottle Cafe");
  });

  it("generates lowercase slugs from name, area, and city", () => {
    expect(
      generateCafeSlug({
        area: "Indiranagar",
        city: "Bengaluru",
        name: "Blue Bottle Demo Cafe!",
      }),
    ).toBe("blue-bottle-demo-cafe-indiranagar-bengaluru");
  });

  it("removes special characters and avoids empty slugs", () => {
    expect(generateCafeSlug({ area: "!!!", city: "###", name: "@@@" })).toBe("cafe");
    expect(generateCafeSlug({ area: "Koramangala 5th Block", city: "Bengaluru", name: "Café 108" })).toBe(
      "cafe-108-koramangala-5th-block-bengaluru",
    );
  });

  it("validates required create cafe fields and defaults status to draft", () => {
    const invalid = validateCreateCafeInput({ area: "", city: "Bengaluru", name: "" });
    const valid = validateCreateCafeInput({
      area: "Indiranagar",
      city: "Bengaluru",
      name: "Blue Bottle Demo Cafe",
    });

    expect(invalid.ok).toBe(false);
    expect(invalid.ok ? [] : invalid.errors).toEqual(
      expect.arrayContaining(["Cafe name must be 2 to 120 characters.", "Area must be 2 to 80 characters."]),
    );
    expect(valid).toEqual({
      ok: true,
      value: {
        address: undefined,
        area: "Indiranagar",
        city: "Bengaluru",
        contactEmail: undefined,
        contactName: undefined,
        contactPhone: undefined,
        googleMapsUrl: undefined,
        name: "Blue Bottle Demo Cafe",
        status: "draft",
      },
    });
  });

  it("rejects invalid contact email and phone", () => {
    const result = validateCreateCafeInput({
      area: "Indiranagar",
      city: "Bengaluru",
      contactEmail: "not-an-email",
      contactPhone: "123",
      name: "Blue Bottle Demo Cafe",
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors).toEqual(
      expect.arrayContaining(["Contact email must be valid.", "Contact phone must be a valid 10 to 15 digit number."]),
    );
  });

  it("validates partial update cafe input", () => {
    expect(validateUpdateCafeInput({ status: "active" })).toEqual({ ok: true, value: { status: "active" } });
    expect(validateUpdateCafeInput({ googleMapsUrl: "http://example.com" })).toEqual({
      errors: ["Google Maps URL must be a valid HTTPS URL."],
      ok: false,
    });
  });

  it("checks active cafe status", () => {
    expect(isCafeActive({ status: "active" })).toBe(true);
    expect(isCafeActive({ status: "draft" })).toBe(false);
    expect(isCafeActive({ status: "inactive" })).toBe(false);
  });

  it("builds public cafe URLs", () => {
    expect(buildCafeQrDisplayUrl("https://dev.mycaffe.in/", "blue bottle")).toBe(
      "https://dev.mycaffe.in/qr/blue%20bottle",
    );
    expect(buildCustomerRedeemUrl("https://dev.mycaffe.in", "blue-bottle-demo")).toBe(
      "https://dev.mycaffe.in/c/blue-bottle-demo",
    );
  });
});
