import { describe, expect, it } from "vitest";
import { base64UrlEncode, buildGoogleAuthorizeUrl, createCodeChallenge } from "./cognito";

describe("cognito auth helpers", () => {
  it("builds a Google Hosted UI authorization URL with PKCE", () => {
    const url = new URL(
      buildGoogleAuthorizeUrl({
        clientId: "client_123",
        codeChallenge: "challenge_123",
        domain: "https://coffee.auth.ap-south-1.amazoncognito.com/",
        redirectUri: "http://localhost:5173/auth/callback",
        state: "state_123",
      }),
    );

    expect(url.origin).toBe("https://coffee.auth.ap-south-1.amazoncognito.com");
    expect(url.pathname).toBe("/oauth2/authorize");
    expect(url.searchParams.get("client_id")).toBe("client_123");
    expect(url.searchParams.get("code_challenge")).toBe("challenge_123");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("identity_provider")).toBe("Google");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:5173/auth/callback");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe("state_123");
  });

  it("uses base64url encoding without padding", () => {
    expect(base64UrlEncode(new Uint8Array([251, 255, 255]))).toBe("-___");
  });

  it("creates a deterministic PKCE challenge for a verifier", async () => {
    await expect(createCodeChallenge("coffee-verifier")).resolves.toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("requires Hosted UI config before building auth URL", () => {
    expect(() =>
      buildGoogleAuthorizeUrl({
        clientId: "",
        codeChallenge: "challenge",
        domain: "https://example.com",
        redirectUri: "http://localhost:5173/auth/callback",
        state: "state",
      }),
    ).toThrow("Cognito Hosted UI is not configured");
  });
});
