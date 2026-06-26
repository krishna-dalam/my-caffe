import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "../config/env.js";

export const createDynamoDocumentClient = (): DynamoDBDocumentClient =>
  DynamoDBDocumentClient.from(
    new DynamoDBClient({
      region: env.awsRegion,
    }),
    {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    },
  );
