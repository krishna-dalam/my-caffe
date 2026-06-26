import { describe, expect, it } from "vitest";
import { customerKeys, gsiKeys } from "./keys.js";

describe("DynamoDB customer keys", () => {
  it("builds stable primary keys for customer-owned records", () => {
    expect(customerKeys.customerProfile("customer_001")).toEqual({
      pk: "CUSTOMER#customer_001",
      sk: "PROFILE",
    });
    expect(customerKeys.membership("customer_001", "membership_001")).toEqual({
      pk: "CUSTOMER#customer_001",
      sk: "MEMBERSHIP#membership_001",
    });
    expect(customerKeys.redemption("customer_001", "redemption_001")).toEqual({
      pk: "CUSTOMER#customer_001",
      sk: "REDEMPTION#redemption_001",
    });
  });

  it("builds cafe lookup and GSI keys", () => {
    expect(customerKeys.cafeSlugLookup("blue-bottle-demo")).toEqual({
      pk: "CAFE_SLUG#blue-bottle-demo",
      sk: "PROFILE",
    });
    expect(gsiKeys.cafeRedemption("cafe_001", "2026-06-26T05:00:00.000Z", "redemption_001")).toEqual({
      gsi1pk: "CAFE#cafe_001",
      gsi1sk: "REDEMPTION#2026-06-26T05:00:00.000Z#redemption_001",
    });
  });
});
