import { env } from "../../config/env.js";
import { createDynamoDocumentClient } from "../../db/dynamodbClient.js";
import type { CustomerRepository } from "./customerRepository.js";
import { createDynamoCustomerRepository } from "./dynamodb/dynamoCustomerRepository.js";
import { createMemoryCustomerRepository } from "./memoryCustomerRepository.js";

export interface CustomerRepositoryOptions {
  customerId: string;
}

export const createCustomerRepository = ({ customerId }: CustomerRepositoryOptions): CustomerRepository => {
  if (env.customerRepository === "dynamodb") {
    return createDynamoCustomerRepository({
      client: createDynamoDocumentClient(),
      customerId,
      tableName: env.tableName,
    });
  }

  return createMemoryCustomerRepository({ customerId });
};
