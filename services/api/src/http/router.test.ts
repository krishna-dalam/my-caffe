import { describe, expect, it } from "vitest";
import { createRouter } from "./router.js";
import type { ApiGatewayHttpEvent } from "./types.js";

const makeEvent = ({
  body,
  claims,
  headers,
  method,
  path,
  query,
}: {
  body?: unknown;
  claims?: Record<string, string>;
  headers?: Record<string, string>;
  method: string;
  path: string;
  query?: Record<string, string>;
}): ApiGatewayHttpEvent => ({
  body: body === undefined ? null : JSON.stringify(body),
  headers,
  queryStringParameters: query ?? null,
  rawPath: path,
  requestContext: {
    authorizer: claims ? { jwt: { claims } } : undefined,
    http: {
      method,
      path,
    },
    requestId: "request_test_001",
  },
});

const parseBody = <T>(body: string): T => JSON.parse(body) as T;

describe("customer API router", () => {
  it("returns health status", async () => {
    const response = await createRouter().handle(makeEvent({ method: "GET", path: "/v1/health" }));

    expect(response.statusCode).toBe(200);
    expect(parseBody<{ data: { status: string } }>(response.body).data.status).toBe("ok");
  });

  it("returns cafe landing without membership for guests", async () => {
    const response = await createRouter().handle(makeEvent({ method: "GET", path: "/v1/cafes/blue-bottle-demo" }));

    expect(response.statusCode).toBe(200);
    expect(parseBody<{ data: { activeMembership: unknown } }>(response.body).data.activeMembership).toBeNull();
  });

  it("accepts public waitlist leads", async () => {
    const response = await createRouter().handle(
      makeEvent({
        body: {
          city: "Bengaluru",
          consentToContact: true,
          email: "coffee@example.com",
          name: "Coffee Fan",
          phone: "9876543210",
          role: "customer",
          source: "instagram",
        },
        method: "POST",
        path: "/v1/waitlist",
      }),
    );

    expect(response.statusCode).toBe(201);
    expect(parseBody<{ data: { leadId: string; message: string } }>(response.body).data).toMatchObject({
      leadId: expect.stringMatching(/^lead_/),
      message: "You are on the My Caffe waitlist.",
    });
  });

  it("validates public waitlist leads", async () => {
    const response = await createRouter().handle(
      makeEvent({
        body: {
          city: "Bengaluru",
          consentToContact: false,
          name: "A",
          phone: "123",
          role: "customer",
        },
        method: "POST",
        path: "/v1/waitlist",
      }),
    );

    expect(response.statusCode).toBe(400);
    expect(parseBody<{ error: { code: string } }>(response.body).error.code).toBe("VALIDATION_ERROR");
  });

  it("requires auth for customer profile", async () => {
    const response = await createRouter().handle(makeEvent({ method: "GET", path: "/v1/me" }));

    expect(response.statusCode).toBe(401);
    expect(parseBody<{ error: { code: string } }>(response.body).error.code).toBe("AUTH_REQUIRED");
  });

  it("redeems coffee and records redemption history for authenticated customer", async () => {
    const router = createRouter();
    const headers = { authorization: "Bearer demo-token" };

    const redemptionResponse = await router.handle(
      makeEvent({
        body: { cafeId: "cafe_demo_001" },
        headers,
        method: "POST",
        path: "/v1/redemptions",
      }),
    );
    const historyResponse = await router.handle(
      makeEvent({
        headers,
        method: "GET",
        path: "/v1/me/redemptions",
        query: { cafeId: "cafe_demo_001" },
      }),
    );

    expect(redemptionResponse.statusCode).toBe(201);
    expect(
      parseBody<{ data: { membership: { remainingCoffees: number }; redemption: { verificationCode: string } } }>(
        redemptionResponse.body,
      ).data,
    ).toMatchObject({
      membership: { remainingCoffees: 7 },
      redemption: { verificationCode: expect.stringMatching(/^\d{4}$/) },
    });
    expect(parseBody<{ data: unknown[] }>(historyResponse.body).data).toHaveLength(1);
  });

  it("scopes customer state by Cognito subject claim", async () => {
    const router = createRouter();

    const redeemForCustomerA = await router.handle(
      makeEvent({
        body: { cafeId: "cafe_demo_001" },
        claims: { email: "customer-a@example.com", name: "Customer A", sub: "cognito_customer_a" },
        method: "POST",
        path: "/v1/redemptions",
      }),
    );
    const customerAHistory = await router.handle(
      makeEvent({
        claims: { email: "customer-a@example.com", name: "Customer A", sub: "cognito_customer_a" },
        method: "GET",
        path: "/v1/me/redemptions",
        query: { cafeId: "cafe_demo_001" },
      }),
    );
    const customerBHistory = await router.handle(
      makeEvent({
        claims: { email: "customer-b@example.com", name: "Customer B", sub: "cognito_customer_b" },
        method: "GET",
        path: "/v1/me/redemptions",
        query: { cafeId: "cafe_demo_001" },
      }),
    );
    const customerBProfile = await router.handle(
      makeEvent({
        claims: { email: "customer-b@example.com", name: "Customer B", sub: "cognito_customer_b" },
        method: "GET",
        path: "/v1/me",
      }),
    );

    expect(redeemForCustomerA.statusCode).toBe(201);
    expect(parseBody<{ data: unknown[] }>(customerAHistory.body).data).toHaveLength(1);
    expect(parseBody<{ data: unknown[] }>(customerBHistory.body).data).toHaveLength(0);
    expect(
      parseBody<{ data: { customerId: string; displayName: string; email: string } }>(customerBProfile.body).data,
    ).toEqual({
      customerId: "cognito_customer_b",
      displayName: "Customer B",
      email: "customer-b@example.com",
    });
  });

  it("blocks redemption after coffee count reaches zero", async () => {
    const router = createRouter();
    const headers = { authorization: "Bearer demo-token" };

    for (let index = 0; index < 8; index += 1) {
      await router.handle(
        makeEvent({
          body: { cafeId: "cafe_demo_001" },
          headers,
          method: "POST",
          path: "/v1/redemptions",
        }),
      );
    }

    const response = await router.handle(
      makeEvent({
        body: { cafeId: "cafe_demo_001" },
        headers,
        method: "POST",
        path: "/v1/redemptions",
      }),
    );

    expect(response.statusCode).toBe(400);
    expect(parseBody<{ error: { code: string } }>(response.body).error.code).toBe("NO_REMAINING_COFFEES");
  });
});
