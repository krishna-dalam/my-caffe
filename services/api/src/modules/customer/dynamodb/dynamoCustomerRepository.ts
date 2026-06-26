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
  tableName: string;
}

const demoCustomerId = "customer_demo_001";

const requireTableName = (tableName: string): void => {
  if (!tableName) {
    throw new Error("COFFEE_TABLE_NAME is required when CUSTOMER_REPOSITORY=dynamodb.");
  }
};

export const createDynamoCustomerRepository = ({
  client,
  tableName,
}: DynamoCustomerRepositoryOptions): CustomerRepository => {
  requireTableName(tableName);

  return {
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
      const key = customerKeys.customerProfile(demoCustomerId);
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
            ":pk": `CUSTOMER#${demoCustomerId}`,
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
            ":pk": `CUSTOMER#${demoCustomerId}`,
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

    async saveMembership() {
      throw new Error("DynamoDB membership updates will be enabled with transactional persistence in the next slice.");
    },

    async saveRedemption() {
      throw new Error("DynamoDB redemption writes will be enabled with transactional persistence in the next slice.");
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

export const toRedemptionTransactWrite = (redemption: Redemption, customerId: string, tableName: string) => {
  const key = customerKeys.redemption(customerId, redemption.redemptionId);
  const gsi = gsiKeys.cafeRedemption(redemption.cafeId, redemption.redeemedAt, redemption.redemptionId);
  return new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          Item: {
            ...redemption,
            PK: key.pk,
            SK: key.sk,
            customerId,
            entityType: "Redemption",
            ...gsi,
          },
          TableName: tableName,
        },
      },
    ],
  });
};
