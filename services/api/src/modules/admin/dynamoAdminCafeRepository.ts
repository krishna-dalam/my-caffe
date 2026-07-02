import { GetCommand, QueryCommand, TransactWriteCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { Cafe, UpdateCafeInput } from "@my-caffe/shared";
import { customerKeys } from "../customer/dynamodb/keys.js";
import type { AdminCafeRepository } from "./adminCafeRepository.js";

type StoredCafe = Cafe & {
  PK: string;
  SK: string;
  entityType: "Cafe";
  gsi1pk: "CAFES";
  gsi1sk: string;
};

interface StoredCafeSlugLookup {
  address?: string;
  PK: string;
  SK: string;
  area: string;
  cafeId: string;
  city: string;
  contactEmail?: string;
  contactName?: string;
  contactPhone?: string;
  createdAt: string;
  customerRedeemUrl?: string;
  entityType: "Cafe";
  googleMapsUrl?: string;
  name: string;
  qrDisplayUrl?: string;
  slug: string;
  status: Cafe["status"];
  updatedAt: string;
}

interface DynamoAdminCafeRepositoryOptions {
  client: DynamoDBDocumentClient;
  tableName: string;
}

const requireTableName = (tableName: string): void => {
  if (!tableName) {
    throw new Error("COFFEE_TABLE_NAME is required when CUSTOMER_REPOSITORY=dynamodb.");
  }
};

const isConditionalCheckFailed = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  (error as { name?: unknown }).name === "ConditionalCheckFailedException";

const cafeListSortKey = (cafe: Pick<Cafe, "createdAt" | "cafeId">): string => `${cafe.createdAt}#${cafe.cafeId}`;

const toStoredCafe = (cafe: Cafe): StoredCafe => {
  const key = customerKeys.cafeProfile(cafe.cafeId);
  return {
    ...cafe,
    PK: key.pk,
    SK: key.sk,
    entityType: "Cafe",
    gsi1pk: "CAFES",
    gsi1sk: cafeListSortKey(cafe),
  };
};

const toStoredSlugLookup = (cafe: Cafe): StoredCafeSlugLookup => {
  const key = customerKeys.cafeSlugLookup(cafe.slug);
  return {
    ...cafe,
    PK: key.pk,
    SK: key.sk,
    entityType: "Cafe",
  };
};

const toCafe = (item: Cafe): Cafe => ({
  address: item.address,
  area: item.area,
  cafeId: item.cafeId,
  city: item.city,
  contactEmail: item.contactEmail,
  contactName: item.contactName,
  contactPhone: item.contactPhone,
  createdAt: item.createdAt,
  customerRedeemUrl: item.customerRedeemUrl,
  googleMapsUrl: item.googleMapsUrl,
  name: item.name,
  qrDisplayUrl: item.qrDisplayUrl,
  slug: item.slug,
  status: item.status,
  updatedAt: item.updatedAt,
});

export const createDynamoAdminCafeRepository = ({
  client,
  tableName,
}: DynamoAdminCafeRepositoryOptions): AdminCafeRepository => {
  requireTableName(tableName);

  const getCafe = async (cafeId: string): Promise<Cafe | null> => {
    const key = customerKeys.cafeProfile(cafeId);
    const response = await client.send(
      new GetCommand({
        Key: {
          PK: key.pk,
          SK: key.sk,
        },
        TableName: tableName,
      }),
    );

    if (!response.Item || response.Item.entityType !== "Cafe") {
      return null;
    }

    return toCafe(response.Item as StoredCafe);
  };

  return {
    async createCafe(cafe) {
      try {
        await client.send(
          new TransactWriteCommand({
            TransactItems: [
              {
                Put: {
                  ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
                  Item: toStoredCafe(cafe),
                  TableName: tableName,
                },
              },
              {
                Put: {
                  ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
                  Item: toStoredSlugLookup(cafe),
                  TableName: tableName,
                },
              },
            ],
          }),
        );
        return true;
      } catch (error) {
        if (isConditionalCheckFailed(error)) {
          return false;
        }

        throw error;
      }
    },

    getCafe,

    async listCafes() {
      const response = await client.send(
        new QueryCommand({
          ExpressionAttributeNames: {
            "#gsi1pk": "gsi1pk",
          },
          ExpressionAttributeValues: {
            ":gsi1pk": "CAFES",
          },
          IndexName: "GSI1",
          KeyConditionExpression: "#gsi1pk = :gsi1pk",
          ScanIndexForward: false,
          TableName: tableName,
        }),
      );

      return ((response.Items ?? []) as StoredCafe[]).filter((item) => item.entityType === "Cafe").map(toCafe);
    },

    async updateCafe(cafeId, updates) {
      const existing = await getCafe(cafeId);
      if (!existing) {
        return null;
      }

      const expressionAttributeNames: Record<string, string> = {
        "#updatedAt": "updatedAt",
      };
      const expressionAttributeValues: Record<string, string> = {
        ":updatedAt": updates.updatedAt,
      };
      const assignments = ["#updatedAt = :updatedAt"];
      const removals: string[] = [];

      const mutableFields: Array<keyof UpdateCafeInput> = [
        "address",
        "area",
        "city",
        "contactEmail",
        "contactName",
        "contactPhone",
        "googleMapsUrl",
        "name",
        "status",
      ];

      for (const field of mutableFields) {
        if (field in updates) {
          expressionAttributeNames[`#${field}`] = field;
          const value = updates[field];
          if (value === undefined) {
            removals.push(`#${field}`);
          } else {
            expressionAttributeValues[`:${field}`] = value;
            assignments.push(`#${field} = :${field}`);
          }
        }
      }

      const removeExpression = removals.length > 0 ? ` REMOVE ${removals.join(", ")}` : "";

      const cafeKey = customerKeys.cafeProfile(cafeId);
      const slugKey = customerKeys.cafeSlugLookup(existing.slug);
      const slugExpressionAttributeNames = { ...expressionAttributeNames };
      const slugExpressionAttributeValues = { ...expressionAttributeValues };
      const transactItems = [
        {
          Update: {
            ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            Key: {
              PK: cafeKey.pk,
              SK: cafeKey.sk,
            },
            TableName: tableName,
            UpdateExpression: `SET ${assignments.join(", ")}${removeExpression}`,
          },
        },
        {
          Update: {
            ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
            ExpressionAttributeNames: slugExpressionAttributeNames,
            ExpressionAttributeValues: slugExpressionAttributeValues,
            Key: {
              PK: slugKey.pk,
              SK: slugKey.sk,
            },
            TableName: tableName,
            UpdateExpression: `SET ${assignments.join(", ")}${removeExpression}`,
          },
        },
      ];

      await client.send(new TransactWriteCommand({ TransactItems: transactItems }));
      return getCafe(cafeId);
    },
  };
};
