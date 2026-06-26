import type { RedeemCoffeeRequest } from "@my-caffe/shared";
import { randomUUID } from "node:crypto";
import type { CustomerService } from "../modules/customer/customerService.js";
import { createCustomerService, RedeemCoffeeError } from "../modules/customer/customerService.js";
import { createMemoryCustomerRepository } from "../modules/customer/memoryCustomerRepository.js";
import { created, failure, noContent, ok } from "./responses.js";
import type { ApiGatewayHttpEvent, ApiGatewayHttpResponse, ApiRequest } from "./types.js";

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

const toRequest = (event: ApiGatewayHttpEvent): ApiRequest => {
  const requestId = event.requestContext?.requestId ?? event.headers?.["x-request-id"] ?? randomUUID();
  return {
    body: parseBody(event),
    headers: event.headers ?? {},
    method: event.requestContext?.http?.method ?? "GET",
    path: event.rawPath ?? event.requestContext?.http?.path ?? event.path ?? "/",
    query: event.queryStringParameters ?? {},
    requestId,
  };
};

const hasBearerToken = (request: ApiRequest): boolean => {
  const authorization = request.headers.authorization ?? request.headers.Authorization;
  return typeof authorization === "string" && authorization.startsWith("Bearer ") && authorization.length > 7;
};

const parseRedeemRequest = (body: unknown): RedeemCoffeeRequest | null => {
  if (!body || typeof body !== "object" || !("cafeId" in body)) {
    return null;
  }

  const cafeId = (body as { cafeId?: unknown }).cafeId;
  return typeof cafeId === "string" && cafeId.trim().length > 0 ? { cafeId } : null;
};

const createDefaultCustomerService = (): CustomerService => createCustomerService(createMemoryCustomerRepository());

export const createRouter = (customerService: CustomerService = createDefaultCustomerService()): AppRouter => ({
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

    const cafeMatch = request.path.match(/^\/v1\/cafes\/([^/]+)$/);
    if (request.method === "GET" && cafeMatch?.[1]) {
      const view = await customerService.getCafeLanding(decodeURIComponent(cafeMatch[1]), hasBearerToken(request));
      if (!view) {
        return failure("NOT_FOUND", "Cafe not found.", request.requestId, 404);
      }

      return ok(view, request.requestId);
    }

    if (!hasBearerToken(request)) {
      return failure("AUTH_REQUIRED", "Authentication is required.", request.requestId, 401);
    }

    if (request.method === "GET" && request.path === "/v1/me") {
      return ok(await customerService.getCurrentCustomer(), request.requestId);
    }

    if (request.method === "GET" && request.path === "/v1/me/redemptions") {
      const cafeId = request.query.cafeId;
      if (!cafeId) {
        return failure("VALIDATION_ERROR", "cafeId query parameter is required.", request.requestId, 400);
      }

      return ok(await customerService.getRedemptions(cafeId), request.requestId);
    }

    if (request.method === "POST" && request.path === "/v1/redemptions") {
      const redeemRequest = parseRedeemRequest(request.body);
      if (!redeemRequest) {
        return failure("VALIDATION_ERROR", "cafeId is required.", request.requestId, 400);
      }

      try {
        return created(await customerService.redeemCoffee(redeemRequest.cafeId), request.requestId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to redeem coffee.";
        const code = error instanceof RedeemCoffeeError ? error.code : "NO_ACTIVE_MEMBERSHIP";
        return failure(code, message, request.requestId, 400);
      }
    }

    return failure("NOT_FOUND", "Route not found.", request.requestId, 404);
  },
});
