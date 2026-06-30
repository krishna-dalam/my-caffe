import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonRequest, makeApiError } from "./httpClient";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

const jsonResponse = (body: unknown, init: ResponseInit): Response =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });

describe("httpClient", () => {
  it("unwraps API success envelopes", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse(
        {
          data: { status: "ok" },
          requestId: "request_001",
        },
        { status: 200 },
      ),
    ) as unknown as typeof fetch;

    await expect(
      jsonRequest<{ status: string }>({
        accessToken: "token_001",
        apiBaseUrl: "https://api.dev.mycaffe.in/v1",
        path: "/health",
      }),
    ).resolves.toEqual({ status: "ok" });
    expect(globalThis.fetch).toHaveBeenCalledWith("https://api.dev.mycaffe.in/v1/health", {
      headers: {
        Authorization: "Bearer token_001",
        "Content-Type": "application/json",
      },
    });
  });

  it("uses backend error envelope messages", async () => {
    const error = await makeApiError(
      jsonResponse(
        {
          error: {
            code: "NO_ACTIVE_MEMBERSHIP",
            message: "No active subscription found for this cafe.",
            requestId: "request_001",
          },
        },
        { status: 400 },
      ),
    );

    expect(error.message).toBe("No active subscription found for this cafe.");
  });

  it("falls back to status text when an error response is not JSON", async () => {
    const error = await makeApiError(new Response("Not found", { status: 404 }));

    expect(error.message).toBe("Request failed with status 404");
  });
});
