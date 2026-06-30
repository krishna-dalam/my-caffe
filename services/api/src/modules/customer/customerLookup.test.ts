import { describe, expect, it } from "vitest";
import { createCustomerEmailScanInput, normalizeCustomerEmail, selectCustomerByEmail } from "./customerLookup.js";

describe("customer lookup", () => {
  it("normalizes customer emails", () => {
    expect(normalizeCustomerEmail("  Customer@Example.COM ")).toBe("customer@example.com");
  });

  it("builds a customer email scan input", () => {
    expect(createCustomerEmailScanInput("CoffeeTable", "Customer@Example.COM")).toEqual({
      ExpressionAttributeNames: {
        "#customerId": "customerId",
        "#displayName": "displayName",
        "#email": "email",
        "#entityType": "entityType",
      },
      ExpressionAttributeValues: {
        ":email": "customer@example.com",
        ":entityType": "Customer",
      },
      FilterExpression: "#entityType = :entityType AND #email = :email",
      ProjectionExpression: "#customerId, #displayName, #email, #entityType",
      TableName: "CoffeeTable",
    });
  });

  it("selects one customer profile by email", () => {
    expect(
      selectCustomerByEmail(
        [
          {
            customerId: "customer_001",
            displayName: "Coffee Member",
            email: "customer@example.com",
            entityType: "Customer",
          },
        ],
        " Customer@Example.COM ",
      ),
    ).toEqual({
      customerId: "customer_001",
      displayName: "Coffee Member",
      email: "customer@example.com",
    });
  });

  it("returns null when no customer profile matches", () => {
    expect(selectCustomerByEmail([{ email: "other@example.com", entityType: "Customer" }], "customer@example.com")).toBeNull();
  });

  it("rejects duplicate customer profiles for the same email", () => {
    expect(() =>
      selectCustomerByEmail(
        [
          { customerId: "customer_001", email: "customer@example.com", entityType: "Customer" },
          { customerId: "customer_002", email: "customer@example.com", entityType: "Customer" },
        ],
        "customer@example.com",
      ),
    ).toThrow("Multiple customer profiles found");
  });
});
