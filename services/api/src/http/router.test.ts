import type { Cafe } from "@my-caffe/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCustomerService } from "../modules/customer/customerService.js";
import { createMemoryCustomerRepository } from "../modules/customer/memoryCustomerRepository.js";
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

const adminClaims = { email: "admin@example.com", name: "Admin User", sub: "cognito_admin_001" };

afterEach(() => {
  vi.unstubAllEnvs();
});

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

  it("returns draft cafe landing by slug for QR display", async () => {
    const service = createCustomerService(
      createMemoryCustomerRepository({
        cafe: {
          area: "Indiranagar",
          cafeId: "cafe_draft_001",
          city: "Bengaluru",
          createdAt: "2026-01-01T00:00:00.000Z",
          name: "Draft QR Cafe",
          slug: "draft-qr-cafe",
          status: "draft",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    );

    const response = await createRouter(service).handle(makeEvent({ method: "GET", path: "/v1/cafes/draft-qr-cafe" }));

    expect(response.statusCode).toBe(200);
    expect(parseBody<{ data: { cafe: Cafe } }>(response.body).data.cafe).toMatchObject({
      name: "Draft QR Cafe",
      status: "draft",
    });
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

  it.each([
    ["draft", "This cafe is not accepting redemptions yet."],
    ["inactive", "This cafe is currently inactive."],
  ] as const)("rejects redemption for %s cafes", async (status, message) => {
    const cafe: Cafe = {
      area: "Indiranagar",
      cafeId: `cafe_${status}_001`,
      city: "Bengaluru",
      createdAt: "2026-01-01T00:00:00.000Z",
      name: `${status} Cafe`,
      slug: `${status}-cafe`,
      status,
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const service = createCustomerService(createMemoryCustomerRepository({ cafe }));

    const response = await createRouter(service).handle(
      makeEvent({
        body: { cafeId: cafe.cafeId },
        headers: { authorization: "Bearer demo-token" },
        method: "POST",
        path: "/v1/redemptions",
      }),
    );

    expect(response.statusCode).toBe(400);
    expect(parseBody<{ error: { code: string; message: string } }>(response.body).error).toMatchObject({
      code: "CAFE_NOT_ACTIVE",
      message,
    });
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

  it("blocks admin cafe access for unauthenticated and non-admin users", async () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    const router = createRouter();

    const unauthenticatedResponse = await router.handle(makeEvent({ method: "GET", path: "/v1/admin/cafes" }));
    const forbiddenResponse = await router.handle(
      makeEvent({
        claims: { email: "customer@example.com", name: "Customer", sub: "cognito_customer_001" },
        method: "GET",
        path: "/v1/admin/cafes",
      }),
    );

    expect(unauthenticatedResponse.statusCode).toBe(401);
    expect(parseBody<{ error: { code: string } }>(unauthenticatedResponse.body).error.code).toBe("AUTH_REQUIRED");
    expect(forbiddenResponse.statusCode).toBe(403);
    expect(parseBody<{ error: { code: string } }>(forbiddenResponse.body).error.code).toBe("FORBIDDEN");
  });

  it("creates an admin cafe with default draft status and links", async () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");

    const response = await createRouter().handle(
      makeEvent({
        body: {
          area: "Indiranagar",
          city: "Bengaluru",
          contactEmail: "manager@example.com",
          contactPhone: "+91 98765 43210",
          name: "Daily Brew",
        },
        claims: adminClaims,
        method: "POST",
        path: "/v1/admin/cafes",
      }),
    );

    const cafe = parseBody<{ data: Cafe }>(response.body).data;

    expect(response.statusCode).toBe(201);
    expect(cafe).toMatchObject({
      area: "Indiranagar",
      cafeId: expect.stringMatching(/^cafe_/),
      city: "Bengaluru",
      contactEmail: "manager@example.com",
      contactPhone: "+919876543210",
      name: "Daily Brew",
      slug: "daily-brew-indiranagar-bengaluru",
      status: "draft",
    });
    expect(cafe.qrDisplayUrl).toBe("http://localhost:5173/qr/daily-brew-indiranagar-bengaluru");
    expect(cafe.customerRedeemUrl).toBe("http://localhost:5173/c/daily-brew-indiranagar-bengaluru");
  });

  it("rejects admin cafe create requests missing required fields", async () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");

    const response = await createRouter().handle(
      makeEvent({
        body: {
          city: "Bengaluru",
          name: "D",
        },
        claims: adminClaims,
        method: "POST",
        path: "/v1/admin/cafes",
      }),
    );

    expect(response.statusCode).toBe(400);
    expect(parseBody<{ error: { code: string; message: string } }>(response.body).error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: expect.stringContaining("Area must be 2 to 80 characters."),
    });
  });

  it("lists admin cafes", async () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    const router = createRouter();

    await router.handle(
      makeEvent({
        body: { area: "HSR Layout", city: "Bengaluru", name: "Morning Cup" },
        claims: adminClaims,
        method: "POST",
        path: "/v1/admin/cafes",
      }),
    );
    await router.handle(
      makeEvent({
        body: { area: "Koramangala", city: "Bengaluru", name: "Evening Roast", status: "active" },
        claims: adminClaims,
        method: "POST",
        path: "/v1/admin/cafes",
      }),
    );

    const response = await router.handle(makeEvent({ claims: adminClaims, method: "GET", path: "/v1/admin/cafes" }));
    const cafes = parseBody<{ data: { cafes: Cafe[] } }>(response.body).data.cafes;

    expect(response.statusCode).toBe(200);
    expect(cafes).toHaveLength(2);
    expect(cafes.map((cafe) => cafe.name)).toEqual(expect.arrayContaining(["Morning Cup", "Evening Roast"]));
  });

  it("gets and updates admin cafe status without changing slug", async () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    const router = createRouter();
    const createResponse = await router.handle(
      makeEvent({
        body: { area: "Indiranagar", city: "Bengaluru", name: "Slug Stable Cafe" },
        claims: adminClaims,
        method: "POST",
        path: "/v1/admin/cafes",
      }),
    );
    const createdCafe = parseBody<{ data: Cafe }>(createResponse.body).data;

    const activeResponse = await router.handle(
      makeEvent({
        body: { status: "active" },
        claims: adminClaims,
        method: "PATCH",
        path: `/v1/admin/cafes/${createdCafe.cafeId}`,
      }),
    );
    const inactiveResponse = await router.handle(
      makeEvent({
        body: { area: "Whitefield", name: "Renamed Cafe", status: "inactive" },
        claims: adminClaims,
        method: "PATCH",
        path: `/v1/admin/cafes/${createdCafe.cafeId}`,
      }),
    );
    const getResponse = await router.handle(
      makeEvent({
        claims: adminClaims,
        method: "GET",
        path: `/v1/admin/cafes/${createdCafe.cafeId}`,
      }),
    );

    expect(activeResponse.statusCode).toBe(200);
    expect(parseBody<{ data: Cafe }>(activeResponse.body).data.status).toBe("active");
    expect(inactiveResponse.statusCode).toBe(200);
    expect(parseBody<{ data: Cafe }>(inactiveResponse.body).data).toMatchObject({
      area: "Whitefield",
      name: "Renamed Cafe",
      slug: createdCafe.slug,
      status: "inactive",
    });
    expect(parseBody<{ data: Cafe }>(getResponse.body).data.slug).toBe(createdCafe.slug);
  });

  it("generates a unique slug when a cafe slug already exists", async () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    const router = createRouter();
    const body = { area: "Indiranagar", city: "Bengaluru", name: "Duplicate Cafe" };

    const firstResponse = await router.handle(
      makeEvent({
        body,
        claims: adminClaims,
        method: "POST",
        path: "/v1/admin/cafes",
      }),
    );
    const secondResponse = await router.handle(
      makeEvent({
        body,
        claims: adminClaims,
        method: "POST",
        path: "/v1/admin/cafes",
      }),
    );

    const firstCafe = parseBody<{ data: Cafe }>(firstResponse.body).data;
    const secondCafe = parseBody<{ data: Cafe }>(secondResponse.body).data;

    expect(firstResponse.statusCode).toBe(201);
    expect(secondResponse.statusCode).toBe(201);
    expect(firstCafe.slug).toBe("duplicate-cafe-indiranagar-bengaluru");
    expect(secondCafe.slug).toMatch(/^duplicate-cafe-indiranagar-bengaluru-[a-f0-9-]+$/);
    expect(secondCafe.slug).not.toBe(firstCafe.slug);
  });
});
