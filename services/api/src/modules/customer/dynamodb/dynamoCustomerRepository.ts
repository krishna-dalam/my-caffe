import { GetCommand, QueryCommand, TransactWriteCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { Cafe, Customer, Membership, Redemption } from "@my-caffe/shared";
import type { CustomerRepository } from "../customerRepository.js";
import { customerKeys, gsiKeys } from "./keys.js";

type StoredCafe = Cafe & { cafeId: string; entityType: "Cafe" };
type StoredCustomer = Customer & { customerId: string; entityType: "Customer" };
type StoredMembership = Membership & { customerId: string; entityType: "Membership" };
type StoredRedemption = Redemption & { customerId: string; entityType: "Redemption" };

interface DynamoCustomerRepositoryOptions {
  client: DynamoDBDocumentClient;
  customerId: string;
  tableName: string;
}

const requireTableName = (tableName: string): void => {
  if (!tableName) {
    throw new Error("COFFEE_TABLE_NAME is required when CUSTOMER_REPOSITORY=dynamodb.");
  }
};

export const createDynamoCustomerRepository = ({
  client,
  customerId,
  tableName,
}: DynamoCustomerRepositoryOptions): CustomerRepository => {
  requireTableName(tableName);

  return {
    async commitRedemption(currentMembership, nextMembership, redemption) {
      const membershipKey = customerKeys.membership(currentMembership.customerId, currentMembership.membershipId);
      const redemptionKey = customerKeys.redemption(currentMembership.customerId, redemption.redemptionId);
      const membershipGsi = gsiKeys.cafeMembership(nextMembership.cafeId, nextMembership.membershipId);
      const redemptionGsi = gsiKeys.cafeRedemption(redemption.cafeId, redemption.redeemedAt, redemption.redemptionId);

      await client.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                ConditionExpression:
                  "attribute_exists(PK) AND attribute_exists(SK) AND #remainingCoffees = :expectedRemainingCoffees AND #status = :activeStatus",
                ExpressionAttributeNames: {
                  "#expiresAt": "expiresAt",
                  "#gsi1pk": "gsi1pk",
                  "#gsi1sk": "gsi1sk",
                  "#remainingCoffees": "remainingCoffees",
                  "#status": "status",
                },
                ExpressionAttributeValues: {
                  ":activeStatus": "active",
                  ":expectedRemainingCoffees": currentMembership.remainingCoffees,
                  ":expiresAt": nextMembership.expiresAt,
                  ":gsi1pk": membershipGsi.gsi1pk,
                  ":gsi1sk": membershipGsi.gsi1sk,
                  ":nextRemainingCoffees": nextMembership.remainingCoffees,
                },
                Key: {
                  PK: membershipKey.pk,
                  SK: membershipKey.sk,
                },
                TableName: tableName,
                UpdateExpression:
                  "SET #remainingCoffees = :nextRemainingCoffees, #expiresAt = :expiresAt, #gsi1pk = :gsi1pk, #gsi1sk = :gsi1sk",
              },
            },
            {
              Put: {
                ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
                Item: {
                  ...redemption,
                  PK: redemptionKey.pk,
                  SK: redemptionKey.sk,
                  customerId: currentMembership.customerId,
                  entityType: "Redemption",
                  ...redemptionGsi,
                },
                TableName: tableName,
              },
            },
          ],
        }),
      );
    },

    async findCafeBySlug(slug) {
      const key = customerKeys.cafeSlugLookup(slug);
      const response = await client.send(
        new GetCommand({
          Key: {
            PK: key.pk,
            SK: key.sk,
          },
          TableName: tableName,
        }),
      );

      return (response.Item as StoredCafe | undefined) ?? null;
    },

    async getCurrentCustomer() {
      const key = customerKeys.customerProfile(customerId);
      const response = await client.send(
        new GetCommand({
          Key: {
            PK: key.pk,
            SK: key.sk,
          },
          TableName: tableName,
        }),
      );

      if (!response.Item) {
        throw new Error("Customer profile not found.");
      }

      return response.Item as StoredCustomer;
    },

    async getMembershipForCafe(cafeId) {
      const response = await client.send(
        new QueryCommand({
          ExpressionAttributeNames: {
            "#pk": "PK",
            "#sk": "SK",
            "#cafeId": "cafeId",
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":cafeId": cafeId,
            ":pk": `CUSTOMER#${customerId}`,
            ":skPrefix": "MEMBERSHIP#",
            ":status": "active",
          },
          FilterExpression: "#cafeId = :cafeId AND #status = :status",
          KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :skPrefix)",
          Limit: 1,
          TableName: tableName,
        }),
      );

      return (response.Items?.[0] as StoredMembership | undefined) ?? null;
    },

    async listRedemptions(cafeId) {
      const response = await client.send(
        new QueryCommand({
          ExpressionAttributeNames: {
            "#pk": "PK",
            "#sk": "SK",
            "#cafeId": "cafeId",
          },
          ExpressionAttributeValues: {
            ":cafeId": cafeId,
            ":pk": `CUSTOMER#${customerId}`,
            ":skPrefix": "REDEMPTION#",
          },
          FilterExpression: "#cafeId = :cafeId",
          KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :skPrefix)",
          ScanIndexForward: false,
          TableName: tableName,
        }),
      );

      return (response.Items ?? []) as StoredRedemption[];
    },

  };
};

export const toMembershipItem = (membership: Membership): StoredMembership & Record<string, string | number> => {
  const key = customerKeys.membership(membership.customerId, membership.membershipId);
  const gsi = gsiKeys.cafeMembership(membership.cafeId, membership.membershipId);
  return {
    ...membership,
    PK: key.pk,
    SK: key.sk,
    entityType: "Membership",
    ...gsi,
  };
};
