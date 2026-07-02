import type { ApiError, ApiSuccess } from "@my-caffe/shared";

interface JsonRequestOptions {
  accessToken: string | null;
  apiBaseUrl: string;
  init?: RequestInit;
  path: string;
}

const isApiErrorEnvelope = (payload: unknown): payload is { error: ApiError } => {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return false;
  }

  const error = (payload as { error?: unknown }).error;
  return Boolean(error && typeof error === "object" && "message" in error);
};

const isApiSuccessEnvelope = <T>(payload: unknown): payload is ApiSuccess<T> =>
  Boolean(payload && typeof payload === "object" && "data" in payload);

const readResponsePayload = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json() as Promise<unknown>;
};

export const makeApiError = async (response: Response): Promise<Error> => {
  const payload = await readResponsePayload(response);
  if (isApiErrorEnvelope(payload)) {
    return new Error(payload.error.message);
  }

  return new Error(`Request failed with status ${response.status}`);
};

export const jsonRequest = async <T>({ accessToken, apiBaseUrl, init, path }: JsonRequestOptions): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw await makeApiError(response);
  }

  const payload = (await response.json()) as T | ApiSuccess<T>;
  return isApiSuccessEnvelope<T>(payload) ? payload.data : payload;
};

