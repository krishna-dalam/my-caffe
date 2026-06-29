import { describe, expect, it } from "vitest";
import { createDynamoCustomerRepository, toMembershipItem } from "./dynamoCustomerRepository.js";

describe("dynamoCustomerRepository", () => {
  it("requires a table name", () => {
    expect(() =>
      createDynamoCustomerRepository({
        client: { send: async () => ({}) },
        customerId: "customer_001",
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

  it("commits redemption with a conditional membership update and redemption put", async () => {
    const sentCommands: unknown[] = [];
    const repository = createDynamoCustomerRepository({
      client: {
        send: async (command: unknown) => {
          sentCommands.push(command);
          return {};
        },
      },
      customerId: "customer_001",
      tableName: "CoffeeTable",
    });

    await repository.commitRedemption(
      {
        cafeId: "cafe_001",
        customerId: "customer_001",
        expiresAt: "2026-07-01T00:00:00.000Z",
        membershipId: "membership_001",
        planId: "plan_001",
        planName: "Monthly 8 Coffee Pass",
        remainingCoffees: 8,
        status: "active",
        totalCoffees: 8,
      },
      {
        cafeId: "cafe_001",
        customerId: "customer_001",
        expiresAt: "2026-07-01T00:00:00.000Z",
        membershipId: "membership_001",
        planId: "plan_001",
        planName: "Monthly 8 Coffee Pass",
        remainingCoffees: 7,
        status: "active",
        totalCoffees: 8,
      },
      {
        cafeId: "cafe_001",
        membershipId: "membership_001",
        redeemedAt: "2026-06-26T06:00:00.000Z",
        redemptionId: "redemption_001",
        remainingCoffeesAfterRedeem: 7,
        verificationCode: "1234",
      },
    );

    const command = sentCommands[0] as { input: { TransactItems: Array<Record<string, unknown>> } };

    expect(command.input.TransactItems).toHaveLength(2);
    expect(command.input.TransactItems[0]).toMatchObject({
      Update: {
        ConditionExpression:
          "attribute_exists(PK) AND attribute_exists(SK) AND #remainingCoffees = :expectedRemainingCoffees AND #status = :activeStatus",
        Key: {
          PK: "CUSTOMER#customer_001",
          SK: "MEMBERSHIP#membership_001",
        },
      },
    });
    expect(command.input.TransactItems[1]).toMatchObject({
      Put: {
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
        Item: {
          PK: "CUSTOMER#customer_001",
          SK: "REDEMPTION#redemption_001",
          verificationCode: "1234",
        },
      },
    });
  });

  it("returns existing customer profile without overwriting it", async () => {
    const sentCommands: unknown[] = [];
    const repository = createDynamoCustomerRepository({
      client: {
        send: async (command: unknown) => {
          sentCommands.push(command);
          return {
            Item: {
              PK: "CUSTOMER#customer_001",
              SK: "PROFILE",
              customerId: "customer_001",
              displayName: "Existing Customer",
              email: "existing@example.com",
              entityType: "Customer",
            },
          };
        },
      },
      customerId: "customer_001",
      tableName: "CoffeeTable",
    });

    const customer = await repository.getOrCreateCurrentCustomer({
      customerId: "customer_001",
      displayName: "New Customer",
      email: "new@example.com",
    });

    expect(customer).toMatchObject({
      customerId: "customer_001",
      displayName: "Existing Customer",
      email: "existing@example.com",
    });
    expect(sentCommands).toHaveLength(1);
  });

  it("creates customer profile when first Cognito login has no profile record", async () => {
    const sentCommands: unknown[] = [];
    const repository = createDynamoCustomerRepository({
      client: {
        send: async (command: unknown) => {
          sentCommands.push(command);

          if (sentCommands.length === 1) {
            return {};
          }

          if (sentCommands.length === 3) {
            return {
              Item: {
                PK: "CUSTOMER#customer_001",
                SK: "PROFILE",
                customerId: "customer_001",
                displayName: "New Customer",
                email: "new@example.com",
                entityType: "Customer",
              },
            };
          }

          return {};
        },
      },
      customerId: "customer_001",
      tableName: "CoffeeTable",
    });

    const customer = await repository.getOrCreateCurrentCustomer({
      customerId: "customer_001",
      displayName: "New Customer",
      email: "new@example.com",
    });
    const putCommand = sentCommands[1] as {
      input: {
        ConditionExpression: string;
        Item: Record<string, unknown>;
        TableName: string;
      };
    };

    expect(customer).toMatchObject({
      customerId: "customer_001",
      displayName: "New Customer",
      email: "new@example.com",
    });
    expect(putCommand.input).toMatchObject({
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      Item: {
        PK: "CUSTOMER#customer_001",
        SK: "PROFILE",
        customerId: "customer_001",
        displayName: "New Customer",
        email: "new@example.com",
        entityType: "Customer",
      },
      TableName: "CoffeeTable",
    });
  });
});
