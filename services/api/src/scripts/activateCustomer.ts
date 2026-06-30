import { PutCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "../config/env.js";
import { createDynamoDocumentClient } from "../db/dynamodbClient.js";
import {
  canIgnoreExistingActivationItem,
  createManualActivationItems,
  type ActivationItem,
  type ManualActivationInput,
} from "../modules/customer/manualActivation.js";

interface CliOptions {
  overwrite: boolean;
  values: Record<string, string>;
}

const readArgs = (args: string[]): CliOptions => {
  const values: Record<string, string> = {};
  let overwrite = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) {
      continue;
    }

    if (arg === "--overwrite") {
      overwrite = true;
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

  return { overwrite, values };
};

const readOption = (options: CliOptions, key: string, envKey: string, fallback?: string): string => {
  const value = options.values[key] ?? process.env[envKey] ?? fallback;
  if (!value || value.trim().length === 0) {
    throw new Error(`${envKey} or --${key} is required.`);
  }

  return value;
};

const readNumberOption = (options: CliOptions, key: string, envKey: string, fallback: number): number => {
  const rawValue = options.values[key] ?? process.env[envKey] ?? fallback.toString();
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${envKey} or --${key} must be a positive integer.`);
  }

  return value;
};

const defaultExpiry = (): string => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  return expiresAt.toISOString();
};

const toActivationInput = (options: CliOptions): ManualActivationInput => ({
  cafeAddress: readOption(options, "cafe-address", "ACTIVATION_CAFE_ADDRESS", "Indiranagar, Bengaluru"),
  cafeId: readOption(options, "cafe-id", "ACTIVATION_CAFE_ID", "cafe_demo_001"),
  cafeName: readOption(options, "cafe-name", "ACTIVATION_CAFE_NAME", "Blue Bottle Demo Cafe"),
  cafeSlug: readOption(options, "cafe-slug", "ACTIVATION_CAFE_SLUG", "blue-bottle-demo"),
  coffeeCount: readNumberOption(options, "coffee-count", "ACTIVATION_COFFEE_COUNT", 8),
  customerDisplayName: readOption(options, "customer-name", "ACTIVATION_CUSTOMER_NAME", "Coffee Member"),
  customerEmail: readOption(options, "customer-email", "ACTIVATION_CUSTOMER_EMAIL"),
  customerId: readOption(options, "customer-id", "ACTIVATION_CUSTOMER_ID"),
  expiresAt: readOption(options, "expires-at", "ACTIVATION_EXPIRES_AT", defaultExpiry()),
  membershipId: readOption(options, "membership-id", "ACTIVATION_MEMBERSHIP_ID", "membership_manual_001"),
  planId: readOption(options, "plan-id", "ACTIVATION_PLAN_ID", "plan_manual_001"),
  planName: readOption(options, "plan-name", "ACTIVATION_PLAN_NAME", "Monthly 8 Coffee Pass"),
});

const isConditionalCheckFailed = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  (error as { name?: unknown }).name === "ConditionalCheckFailedException";

const putActivationItem = async ({
  client,
  item,
  overwrite,
  tableName,
}: {
  client: DynamoDBDocumentClient;
  item: ActivationItem;
  overwrite: boolean;
  tableName: string;
}): Promise<void> => {
  try {
    await client.send(
      new PutCommand({
        ConditionExpression: overwrite ? undefined : "attribute_not_exists(PK) AND attribute_not_exists(SK)",
        Item: item,
        TableName: tableName,
      }),
    );
  } catch (error) {
    if (!overwrite && isConditionalCheckFailed(error) && canIgnoreExistingActivationItem(item)) {
      console.info(`Skipped existing ${item.entityType} record ${item.PK} ${item.SK}.`);
      return;
    }

    throw error;
  }
};

const activateCustomer = async (): Promise<void> => {
  const options = readArgs(process.argv.slice(2));
  const tableName = env.tableName;
  if (!tableName) {
    throw new Error("COFFEE_TABLE_NAME is required.");
  }

  const input = toActivationInput(options);
  const items = createManualActivationItems(input);
  const client = createDynamoDocumentClient();

  for (const item of items) {
    await putActivationItem({
      client,
      item,
      overwrite: options.overwrite,
      tableName,
    });
  }

  console.info(
    `Activated ${input.customerId} for ${input.cafeSlug} with ${input.coffeeCount} coffees. ` +
      `Use --overwrite to replace existing records.`,
  );
};

activateCustomer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unable to activate customer.";
  console.error(message);
  process.exitCode = 1;
});
