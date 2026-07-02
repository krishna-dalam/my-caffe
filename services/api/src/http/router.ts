import type { RedeemCoffeeRequest } from "@my-caffe/shared";
import { validateCreateCafeInput, validateUpdateCafeInput } from "@my-caffe/shared";
import { randomUUID } from "node:crypto";
import { env, readAdminEmails } from "../config/env.js";
import { AdminCafeConflictError, type AdminCafeService, createAdminCafeService } from "../modules/admin/adminCafeService.js";
import { createAdminCafeRepository } from "../modules/admin/repositoryFactory.js";
import type { CustomerService } from "../modules/customer/customerService.js";
import { createCustomerService, RedeemCoffeeError } from "../modules/customer/customerService.js";
import { createCustomerRepository } from "../modules/customer/repositoryFactory.js";
import { createDynamoDocumentClient } from "../db/dynamodbClient.js";
import { createDynamoWaitlistRepository, createMemoryWaitlistRepository } from "../modules/waitlist/waitlistRepository.js";
import { createWaitlistService, parseJoinWaitlistRequest, WaitlistValidationError } from "../modules/waitlist/waitlistService.js";
import { created, failure, noContent, ok } from "./responses.js";
import type { ApiGatewayHttpEvent, ApiGatewayHttpResponse, ApiRequest, ApiRequestPrincipal } from "./types.js";

export interface AppRouter {
  handle(event: ApiGatewayHttpEvent): Promise<ApiGatewayHttpResponse>;
}

const parseBody = (event: ApiGatewayHttpEvent): unknown => {
  if (!event.body) {
    return null;
  }

  const body = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  return JSON.parse(body) as unknown;
};

const getClaimString = (
  claims: Record<string, string | number | boolean | string[] | undefined> | undefined,
  key: string,
): string | undefined => {
  const value = claims?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
};

const hasBearerToken = (request: Pick<ApiRequest, "headers">): boolean => {
  const authorization = request.headers.authorization ?? request.headers.Authorization;
  return typeof authorization === "string" && authorization.startsWith("Bearer ") && authorization.length > 7;
};

const getPrincipal = (
  event: ApiGatewayHttpEvent,
  headers: Record<string, string | undefined>,
): ApiRequestPrincipal | null => {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  const customerId = getClaimString(claims, "sub");

  if (customerId) {
    return {
      customerId,
      displayName: getClaimString(claims, "name"),
      email: getClaimString(claims, "email"),
    };
  }

  if (hasBearerToken({ headers })) {
    return { customerId: "customer_demo_001", displayName: "Aarav Mehta", email: "aarav@example.com" };
  }

  return null;
};

const toRequest = (event: ApiGatewayHttpEvent): ApiRequest => {
  const requestId = event.requestContext?.requestId ?? event.headers?.["x-request-id"] ?? randomUUID();
  const headers = event.headers ?? {};
  return {
    body: parseBody(event),
    headers,
    method: event.requestContext?.http?.method ?? "GET",
    path: event.rawPath ?? event.requestContext?.http?.path ?? event.path ?? "/",
    principal: getPrincipal(event, headers),
    query: event.queryStringParameters ?? {},
    requestId,
  };
};

const parseRedeemRequest = (body: unknown): RedeemCoffeeRequest | null => {
  if (!body || typeof body !== "object" || !("cafeId" in body)) {
    return null;
  }

  const cafeId = (body as { cafeId?: unknown }).cafeId;
  return typeof cafeId === "string" && cafeId.trim().length > 0 ? { cafeId } : null;
};

const createDefaultCustomerService = (customerId: string): CustomerService =>
  createCustomerService(createCustomerRepository({ customerId }));

const isAdminPrincipal = (principal: ApiRequestPrincipal): boolean => {
  const email = principal.email?.trim().toLowerCase();
  return email ? readAdminEmails().includes(email) : false;
};

export const createRouter = (customerService?: CustomerService): AppRouter => {
  const localServicesByCustomerId = new Map<string, CustomerService>();
  const memoryWaitlistRepository = createMemoryWaitlistRepository();
  const adminCafeService: AdminCafeService = createAdminCafeService(createAdminCafeRepository(), env.allowedOrigin);

  const getService = (principal: ApiRequestPrincipal | null): CustomerService => {
    if (customerService) {
      return customerService;
    }

    const customerId = principal?.customerId ?? "customer_demo_001";
    if (env.customerRepository === "dynamodb") {
      return createDefaultCustomerService(customerId);
    }

    const existingService = localServicesByCustomerId.get(customerId);
    if (existingService) {
      return existingService;
    }

    const service = createDefaultCustomerService(customerId);
    localServicesByCustomerId.set(customerId, service);
    return service;
  };

  const waitlistService = createWaitlistService(
    env.customerRepository === "dynamodb"
      ? createDynamoWaitlistRepository({ client: createDynamoDocumentClient(), tableName: env.tableName })
      : memoryWaitlistRepository,
  );

  return {
    async handle(event) {
      let request: ApiRequest;

      try {
        request = toRequest(event);
      } catch {
        const requestId = event.requestContext?.requestId ?? randomUUID();
        return failure("VALIDATION_ERROR", "Request body must be valid JSON.", requestId, 400);
      }

      if (request.method === "OPTIONS") {
        return noContent();
      }

      if (request.method === "GET" && request.path === "/v1/health") {
        return ok({ status: "ok" }, request.requestId);
      }

      if (request.method === "POST" && request.path === "/v1/waitlist") {
        try {
          return created(await waitlistService.join(parseJoinWaitlistRequest(request.body)), request.requestId);
        } catch (error) {
          if (error instanceof WaitlistValidationError) {
            return failure("VALIDATION_ERROR", error.message, request.requestId, 400);
          }

          throw error;
        }
      }

      const cafeMatch = request.path.match(/^\/v1\/cafes\/([^/]+)$/);
      if (request.method === "GET" && cafeMatch?.[1]) {
        const service = getService(request.principal);
        const view = await service.getCafeLanding(decodeURIComponent(cafeMatch[1]), request.principal !== null);
        if (!view) {
          return failure("NOT_FOUND", "Cafe not found.", request.requestId, 404);
        }

        return ok(view, request.requestId);
      }

      const adminCafeDetailMatch = request.path.match(/^\/v1\/admin\/cafes\/([^/]+)$/);
      const isAdminCafeRoute = request.path === "/v1/admin/cafes" || adminCafeDetailMatch !== null;
      if (isAdminCafeRoute) {
        if (!request.principal) {
          return failure("AUTH_REQUIRED", "Authentication is required.", request.requestId, 401);
        }

        if (!isAdminPrincipal(request.principal)) {
          return failure("FORBIDDEN", "Admin access is required.", request.requestId, 403);
        }

        if (request.method === "POST" && request.path === "/v1/admin/cafes") {
          const validation = validateCreateCafeInput(request.body);
          if (!validation.ok) {
            return failure("VALIDATION_ERROR", validation.errors.join(" "), request.requestId, 400);
          }

          try {
            return created(await adminCafeService.createCafe(validation.value), request.requestId);
          } catch (error) {
            if (error instanceof AdminCafeConflictError) {
              return failure("VALIDATION_ERROR", error.message, request.requestId, 409);
            }

            throw error;
          }
        }

        if (request.method === "GET" && request.path === "/v1/admin/cafes") {
          return ok({ cafes: await adminCafeService.listCafes() }, request.requestId);
        }

        if (adminCafeDetailMatch?.[1] && request.method === "GET") {
          const cafe = await adminCafeService.getCafe(decodeURIComponent(adminCafeDetailMatch[1]));
          if (!cafe) {
            return failure("NOT_FOUND", "Cafe not found.", request.requestId, 404);
          }

          return ok(cafe, request.requestId);
        }

        if (adminCafeDetailMatch?.[1] && request.method === "PATCH") {
          const validation = validateUpdateCafeInput(request.body);
          if (!validation.ok) {
            return failure("VALIDATION_ERROR", validation.errors.join(" "), request.requestId, 400);
          }

          const cafe = await adminCafeService.updateCafe(decodeURIComponent(adminCafeDetailMatch[1]), validation.value);
          if (!cafe) {
            return failure("NOT_FOUND", "Cafe not found.", request.requestId, 404);
          }

          return ok(cafe, request.requestId);
        }

        return failure("NOT_FOUND", "Route not found.", request.requestId, 404);
      }

      if (!request.principal) {
        return failure("AUTH_REQUIRED", "Authentication is required.", request.requestId, 401);
      }

      const service = getService(request.principal);

      if (request.method === "GET" && request.path === "/v1/me") {
        return ok(await service.getCurrentCustomer(request.principal), request.requestId);
      }

      if (request.method === "GET" && request.path === "/v1/me/redemptions") {
        const cafeId = request.query.cafeId;
        if (!cafeId) {
          return failure("VALIDATION_ERROR", "cafeId query parameter is required.", request.requestId, 400);
        }

        return ok(await service.getRedemptions(cafeId), request.requestId);
      }

      if (request.method === "POST" && request.path === "/v1/redemptions") {
        const redeemRequest = parseRedeemRequest(request.body);
        if (!redeemRequest) {
          return failure("VALIDATION_ERROR", "cafeId is required.", request.requestId, 400);
        }

        try {
          return created(await service.redeemCoffee(redeemRequest.cafeId), request.requestId);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to redeem coffee.";
          const code = error instanceof RedeemCoffeeError ? error.code : "NO_ACTIVE_MEMBERSHIP";
          return failure(code, message, request.requestId, 400);
        }
      }

      return failure("NOT_FOUND", "Route not found.", request.requestId, 404);
    },
  };
};
