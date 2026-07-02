import { afterEach, describe, expect, it, vi } from "vitest";
import { applyRuntimeConfig, env, loadRuntimeConfig } from "./env";

const originalEnv = { ...env };
const originalFetch = globalThis.fetch;

afterEach(() => {
  Object.assign(env, originalEnv);
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("customer web runtime config", () => {
  it("applies runtime config values without allowing dev access tokens", () => {
    applyRuntimeConfig({
      apiBaseUrl: "https://api.dev.mycaffe.in/v1",
      appName: "My Caffe Dev",
      cognitoClientId: "client_001",
      cognitoDomain: "https://my-caffe-dev.auth.ap-south-1.amazoncognito.com",
      cognitoRedirectUri: "https://dev.mycaffe.in/auth/callback",
      useMockApi: false,
      webBaseUrl: "https://dev.mycaffe.in",
    });

    expect(env).toMatchObject({
      apiBaseUrl: "https://api.dev.mycaffe.in/v1",
      appName: "My Caffe Dev",
      cognitoClientId: "client_001",
      cognitoDomain: "https://my-caffe-dev.auth.ap-south-1.amazoncognito.com",
      cognitoRedirectUri: "https://dev.mycaffe.in/auth/callback",
      useMockApi: false,
      webBaseUrl: "https://dev.mycaffe.in",
    });
    expect(env.devAccessToken).toBe(originalEnv.devAccessToken);
  });

  it("loads config.json when it is present", async () => {
    globalThis.fetch = vi.fn(async () => ({
      json: async () => ({
        apiBaseUrl: "https://api.dev.mycaffe.in/v1",
        useMockApi: false,
        webBaseUrl: "https://dev.mycaffe.in",
      }),
      ok: true,
    })) as unknown as typeof fetch;

    await loadRuntimeConfig("/config.json");

    expect(globalThis.fetch).toHaveBeenCalledWith("/config.json", { cache: "no-store" });
    expect(env.apiBaseUrl).toBe("https://api.dev.mycaffe.in/v1");
    expect(env.useMockApi).toBe(false);
    expect(env.webBaseUrl).toBe("https://dev.mycaffe.in");
  });

  it("keeps build-time env when config.json is unavailable", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
    })) as unknown as typeof fetch;

    await loadRuntimeConfig("/config.json");

    expect(env).toMatchObject(originalEnv);
  });
});
