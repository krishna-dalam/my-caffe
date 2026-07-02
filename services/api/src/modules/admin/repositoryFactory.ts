import { env } from "../../config/env.js";
import { createDynamoDocumentClient } from "../../db/dynamodbClient.js";
import type { AdminCafeRepository } from "./adminCafeRepository.js";
import { createDynamoAdminCafeRepository } from "./dynamoAdminCafeRepository.js";
import { createMemoryAdminCafeRepository } from "./memoryAdminCafeRepository.js";

export const createAdminCafeRepository = (): AdminCafeRepository => {
  if (env.customerRepository === "dynamodb") {
    return createDynamoAdminCafeRepository({
      client: createDynamoDocumentClient(),
      tableName: env.tableName,
    });
  }

  return createMemoryAdminCafeRepository();
};

