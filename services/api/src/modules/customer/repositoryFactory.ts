import { env } from "../../config/env.js";
import { createDynamoDocumentClient } from "../../db/dynamodbClient.js";
import type { CustomerRepository } from "./customerRepository.js";
import { createDynamoCustomerRepository } from "./dynamodb/dynamoCustomerRepository.js";
import { createMemoryCustomerRepository } from "./memoryCustomerRepository.js";

export const createCustomerRepository = (): CustomerRepository => {
  if (env.customerRepository === "dynamodb") {
    return createDynamoCustomerRepository({
      client: createDynamoDocumentClient(),
      tableName: env.tableName,
    });
  }

  return createMemoryCustomerRepository();
};
