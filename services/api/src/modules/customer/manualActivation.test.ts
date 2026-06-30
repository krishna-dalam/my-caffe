import { describe, expect, it } from "vitest";
import { canIgnoreExistingActivationItem, createManualActivationItems } from "./manualActivation.js";

describe("manual activation items", () => {
  it("creates cafe, customer, and membership records for a Cognito customer", () => {
    const items = createManualActivationItems({
      cafeAddress: "Indiranagar, Bengaluru",
      cafeId: "cafe_demo_001",
      cafeName: "Blue Bottle Demo Cafe",
      cafeSlug: "blue-bottle-demo",
      coffeeCount: 8,
      customerDisplayName: "Aarav Mehta",
      customerEmail: "aarav@example.com",
      customerId: "cognito_sub_001",
      expiresAt: "2026-07-28T00:00:00.000Z",
      membershipId: "membership_manual_001",
      planId: "plan_manual_001",
      planName: "Monthly 8 Coffee Pass",
    });

    expect(items).toHaveLength(4);
    expect(items[0]).toMatchObject({
      PK: "CAFE#cafe_demo_001",
      SK: "PROFILE",
      cafeId: "cafe_demo_001",
      entityType: "Cafe",
      slug: "blue-bottle-demo",
    });
    expect(items[1]).toMatchObject({
      PK: "CAFE_SLUG#blue-bottle-demo",
      SK: "PROFILE",
      cafeId: "cafe_demo_001",
      entityType: "Cafe",
    });
    expect(items[2]).toMatchObject({
      PK: "CUSTOMER#cognito_sub_001",
      SK: "PROFILE",
      customerId: "cognito_sub_001",
      entityType: "Customer",
    });
    expect(items[3]).toMatchObject({
      PK: "CUSTOMER#cognito_sub_001",
      SK: "MEMBERSHIP#membership_manual_001",
      cafeId: "cafe_demo_001",
      entityType: "Membership",
      gsi1pk: "CAFE#cafe_demo_001",
      gsi1sk: "MEMBERSHIP#membership_manual_001",
      remainingCoffees: 8,
      status: "active",
    });
  });

  it("allows existing cafe and customer seed records but not memberships", () => {
    expect(canIgnoreExistingActivationItem({ PK: "CAFE#cafe_001", SK: "PROFILE", entityType: "Cafe" })).toBe(true);
    expect(canIgnoreExistingActivationItem({ PK: "CUSTOMER#customer_001", SK: "PROFILE", entityType: "Customer" })).toBe(
      true,
    );
    expect(
      canIgnoreExistingActivationItem({
        PK: "CUSTOMER#customer_001",
        SK: "MEMBERSHIP#membership_001",
        entityType: "Membership",
      }),
    ).toBe(false);
  });
});
