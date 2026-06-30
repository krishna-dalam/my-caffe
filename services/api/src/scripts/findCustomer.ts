import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { env } from "../config/env.js";
import { createDynamoDocumentClient } from "../db/dynamodbClient.js";
import { createCustomerEmailScanInput, selectCustomerByEmail } from "../modules/customer/customerLookup.js";

interface CliOptions {
  values: Record<string, string>;
}

const readArgs = (args: string[]): CliOptions => {
  const values: Record<string, string> = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) {
      continue;
    }

    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    values[key] = value;
    index += 1;
  }

  return { values };
};

const readOption = (options: CliOptions, key: string, envKey: string): string => {
  const value = options.values[key] ?? process.env[envKey];
  if (!value || value.trim().length === 0) {
    throw new Error(`${envKey} or --${key} is required.`);
  }

  return value;
};

const findCustomer = async (): Promise<void> => {
  const options = readArgs(process.argv.slice(2));
  const tableName = env.tableName;
  if (!tableName) {
    throw new Error("COFFEE_TABLE_NAME is required.");
  }

  const email = readOption(options, "email", "CUSTOMER_EMAIL");
  const client = createDynamoDocumentClient();
  const response = await client.send(new ScanCommand(createCustomerEmailScanInput(tableName, email)));
  const customer = selectCustomerByEmail(response.Items, email);

  if (!customer) {
    throw new Error(`No customer profile found for ${email}. Ask the customer to sign in once, then retry.`);
  }

  console.info(`Customer ID: ${customer.customerId}`);
  console.info(`Email: ${customer.email}`);
  if (customer.displayName) {
    console.info(`Name: ${customer.displayName}`);
  }
};

findCustomer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unable to find customer.";
  console.error(message);
  process.exitCode = 1;
});
