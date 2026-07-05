import { randomUUID } from "node:crypto";
import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { env } from "../config/env.js";
import { createDynamoDocumentClient } from "../db/dynamodbClient.js";
import { createDynamoAdminCafeRepository } from "../modules/admin/dynamoAdminCafeRepository.js";
import { createCustomerEmailScanInput, selectCustomerByEmail } from "../modules/customer/customerLookup.js";
import { toMembershipItem } from "../modules/customer/dynamodb/dynamoCustomerRepository.js";
import {
  buildSeedCafe,
  buildSeedMembership,
  buildSeedPlan,
  buildSeedSlug,
  defaultDevCafeSeedValues,
  defaultExpiry,
  formatDevCafeSeedSummary,
  slugWithAttempt,
  type DevCafeSeedConfig,
} from "../modules/devSeed/devCafeSeed.js";

interface CliOptions {
  values: Record<string, string>;
}

const maxSlugAttempts = 8;

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

const readOptional = (options: CliOptions, key: string, envKey: string): string | undefined => {
  const value = options.values[key] ?? process.env[envKey];
  return value && value.trim().length > 0 ? value.trim() : undefined;
};

const readRequired = (options: CliOptions, key: string, envKeys: string[], fallback?: string): string => {
  const value = options.values[key] ?? envKeys.map((envKey) => process.env[envKey]).find(Boolean) ?? fallback;
  if (!value || value.trim().length === 0) {
    throw new Error(`${envKeys.join(" or ")} or --${key} is required.`);
  }

  return value.trim();
};

const readNumber = (options: CliOptions, key: string, envKey: string, fallback: number): number => {
  const rawValue = options.values[key] ?? process.env[envKey] ?? fallback.toString();
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${envKey} or --${key} must be a positive integer.`);
  }

  return value;
};

const toSeedConfig = (options: CliOptions): DevCafeSeedConfig => ({
  apiBaseUrl: readRequired(options, "api-base-url", ["API_BASE_URL"], defaultDevCafeSeedValues.apiBaseUrl),
  cafeAddress: readRequired(options, "cafe-address", ["SEED_CAFE_ADDRESS"], defaultDevCafeSeedValues.cafeAddress),
  cafeArea: readRequired(options, "cafe-area", ["SEED_CAFE_AREA"], defaultDevCafeSeedValues.cafeArea),
  cafeCity: readRequired(options, "cafe-city", ["SEED_CAFE_CITY"], defaultDevCafeSeedValues.cafeCity),
  cafeName: readRequired(options, "cafe-name", ["SEED_CAFE_NAME"], defaultDevCafeSeedValues.cafeName),
  cafeSlug: readOptional(options, "cafe-slug", "SEED_CAFE_SLUG") ?? defaultDevCafeSeedValues.cafeSlug,
  cafeStatus: "active",
  coffeeCount: readNumber(options, "coffee-count", "SEED_COFFEE_COUNT", defaultDevCafeSeedValues.coffeeCount),
  membershipId: readRequired(options, "membership-id", ["SEED_MEMBERSHIP_ID"], defaultDevCafeSeedValues.membershipId),
  planId: readRequired(options, "plan-id", ["SEED_PLAN_ID"], defaultDevCafeSeedValues.planId),
  planName: readRequired(options, "plan-name", ["SEED_PLAN_NAME"], defaultDevCafeSeedValues.planName),
  tableName: readRequired(options, "table-name", ["TABLE_NAME", "COFFEE_TABLE_NAME"], env.tableName),
  webBaseUrl: readRequired(options, "web-base-url", ["WEB_BASE_URL"], defaultDevCafeSeedValues.webBaseUrl),
});

const isConditionalCheckFailed = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  (error as { name?: unknown }).name === "ConditionalCheckFailedException";

const seedCafe = async (): Promise<void> => {
  const options = readArgs(process.argv.slice(2));
  const customerEmail = readOptional(options, "customer-email", "CUSTOMER_EMAIL");
  const config = toSeedConfig(options);
  const client = createDynamoDocumentClient();
  const cafeRepository = createDynamoAdminCafeRepository({ client, tableName: config.tableName });
  const baseSlug = buildSeedSlug(config);
  const now = new Date().toISOString();
  let cafe = null;

  for (let attempt = 0; attempt < maxSlugAttempts; attempt += 1) {
    const candidate = buildSeedCafe({
      cafeId: `cafe_${randomUUID()}`,
      config,
      now,
      slug: slugWithAttempt(baseSlug, attempt),
    });

    if (await cafeRepository.createCafe(candidate)) {
      cafe = candidate;
      break;
    }
  }

  if (!cafe) {
    throw new Error(`Unable to create a cafe with a unique slug after ${maxSlugAttempts} attempts.`);
  }

  const plan = buildSeedPlan(config, cafe.cafeId);
  let customer = undefined;
  let membership = undefined;

  if (customerEmail) {
    const activationConfig = {
      ...config,
      membershipId:
        config.membershipId === defaultDevCafeSeedValues.membershipId ? `membership_${cafe.cafeId}` : config.membershipId,
    };
    const response = await client.send(new ScanCommand(createCustomerEmailScanInput(config.tableName, customerEmail)));
    customer = selectCustomerByEmail(response.Items, customerEmail) ?? undefined;
    if (!customer) {
      throw new Error(`No customer profile found for ${customerEmail}. Ask the customer to sign in once, then retry.`);
    }

    membership = buildSeedMembership({
      cafe,
      config: activationConfig,
      customer,
      expiresAt: defaultExpiry(),
    });

    try {
      await client.send(
        new PutCommand({
          ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
          Item: toMembershipItem(membership),
          TableName: config.tableName,
        }),
      );
    } catch (error) {
      if (isConditionalCheckFailed(error)) {
        throw new Error(`Membership ${membership.membershipId} already exists for ${customer.email}.`);
      }

      throw error;
    }
  }

  for (const line of formatDevCafeSeedSummary({ cafe, customer, membership, plan })) {
    console.info(line);
  }
  console.info(`Admin API: ${config.apiBaseUrl}/admin/cafes/${encodeURIComponent(cafe.cafeId)}`);
};

seedCafe().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unable to seed dev cafe.";
  console.error(message);
  process.exitCode = 1;
});
