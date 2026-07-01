import { PutCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { JoinWaitlistRequest } from "@my-caffe/shared";
import { randomUUID } from "node:crypto";

export interface WaitlistLead extends JoinWaitlistRequest {
  createdAt: string;
  leadId: string;
}

export interface WaitlistRepository {
  createLead(input: JoinWaitlistRequest): Promise<WaitlistLead>;
}

export const createMemoryWaitlistRepository = (): WaitlistRepository => {
  const leads: WaitlistLead[] = [];

  return {
    async createLead(input) {
      const lead = {
        ...input,
        createdAt: new Date().toISOString(),
        leadId: `lead_${randomUUID()}`,
      };
      leads.push(lead);
      return lead;
    },
  };
};

export const createDynamoWaitlistRepository = ({
  client,
  tableName,
}: {
  client: DynamoDBDocumentClient;
  tableName: string;
}): WaitlistRepository => ({
  async createLead(input) {
    if (!tableName) {
      throw new Error("COFFEE_TABLE_NAME is required to store waitlist leads.");
    }

    const lead = {
      ...input,
      createdAt: new Date().toISOString(),
      leadId: `lead_${randomUUID()}`,
    };

    await client.send(
      new PutCommand({
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
        Item: {
          ...lead,
          PK: `WAITLIST#${lead.leadId}`,
          SK: "PROFILE",
          entityType: "WaitlistLead",
          gsi1pk: `WAITLIST#${lead.role}`,
          gsi1sk: lead.createdAt,
        },
        TableName: tableName,
      }),
    );

    return lead;
  },
});
