import type { ScanCommandInput } from "@aws-sdk/lib-dynamodb";

export interface CustomerLookupResult {
  customerId: string;
  displayName?: string;
  email: string;
}

interface CustomerLookupItem {
  customerId?: unknown;
  displayName?: unknown;
  email?: unknown;
  entityType?: unknown;
}

type CustomerLookupMatch = CustomerLookupItem & {
  customerId: string;
  email: string;
};

export const normalizeCustomerEmail = (email: string): string => email.trim().toLowerCase();

export const createCustomerEmailScanInput = (tableName: string, email: string): ScanCommandInput => ({
  ExpressionAttributeNames: {
    "#customerId": "customerId",
    "#displayName": "displayName",
    "#email": "email",
    "#entityType": "entityType",
  },
  ExpressionAttributeValues: {
    ":email": normalizeCustomerEmail(email),
    ":entityType": "Customer",
  },
  FilterExpression: "#entityType = :entityType AND #email = :email",
  ProjectionExpression: "#customerId, #displayName, #email, #entityType",
  TableName: tableName,
});

export const selectCustomerByEmail = (items: unknown[] | undefined, email: string): CustomerLookupResult | null => {
  const normalizedEmail = normalizeCustomerEmail(email);
  const matches = (items ?? []).filter((item): item is CustomerLookupMatch => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const candidate = item as CustomerLookupItem;
    return (
      candidate.entityType === "Customer" &&
      typeof candidate.customerId === "string" &&
      typeof candidate.email === "string" &&
      normalizeCustomerEmail(candidate.email) === normalizedEmail
    );
  });

  if (matches.length === 0) {
    return null;
  }

  if (matches.length > 1) {
    throw new Error(`Multiple customer profiles found for ${normalizedEmail}. Use the Cognito sub explicitly.`);
  }

  const match = matches[0];
  if (!match) {
    return null;
  }

  return {
    customerId: match.customerId,
    displayName: typeof match.displayName === "string" ? match.displayName : undefined,
    email: match.email,
  };
};
