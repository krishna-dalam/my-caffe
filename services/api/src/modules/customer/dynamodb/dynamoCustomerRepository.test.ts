import { describe, expect, it } from "vitest";
import { createDynamoCustomerRepository, toMembershipItem } from "./dynamoCustomerRepository.js";

describe("dynamoCustomerRepository", () => {
  it("requires a table name", () => {
    expect(() =>
      createDynamoCustomerRepository({
        client: { send: async () => ({}) },
        tableName: "",
      }),
    ).toThrow("COFFEE_TABLE_NAME is required");
  });

  it("maps memberships to single-table items", () => {
    expect(
      toMembershipItem({
        cafeId: "cafe_001",
        customerId: "customer_001",
        expiresAt: "2026-07-01T00:00:00.000Z",
        membershipId: "membership_001",
        planId: "plan_001",
        planName: "Monthly 8 Coffee Pass",
        remainingCoffees: 8,
        status: "active",
        totalCoffees: 8,
      }),
    ).toMatchObject({
      PK: "CUSTOMER#customer_001",
      SK: "MEMBERSHIP#membership_001",
      entityType: "Membership",
      gsi1pk: "CAFE#cafe_001",
      gsi1sk: "MEMBERSHIP#membership_001",
    });
  });
});
