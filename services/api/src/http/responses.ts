import type { ApiErrorCode, ApiSuccess } from "@my-caffe/shared";
import { env } from "../config/env.js";
import type { ApiGatewayHttpResponse } from "./types.js";

const headers = {
  "Access-Control-Allow-Headers": "Authorization,Content-Type,X-Request-Id",
  "Access-Control-Allow-Methods": "GET,PATCH,POST,OPTIONS",
  "Access-Control-Allow-Origin": env.allowedOrigin,
  "Content-Type": "application/json",
};

export const noContent = (): ApiGatewayHttpResponse => ({
  body: "",
  headers,
  statusCode: 204,
});

export const ok = <T>(data: T, requestId: string): ApiGatewayHttpResponse => ({
  body: JSON.stringify({ data, requestId } satisfies ApiSuccess<T>),
  headers,
  statusCode: 200,
});

export const created = <T>(data: T, requestId: string): ApiGatewayHttpResponse => ({
  body: JSON.stringify({ data, requestId } satisfies ApiSuccess<T>),
  headers,
  statusCode: 201,
});

export const failure = (
  code: ApiErrorCode,
  message: string,
  requestId: string,
  statusCode: number,
): ApiGatewayHttpResponse => ({
  body: JSON.stringify({
    error: {
      code,
      message,
      requestId,
    },
  }),
  headers,
  statusCode,
});
