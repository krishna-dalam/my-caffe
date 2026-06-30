import { describe, expect, it } from "vitest";
import { chooseRequestAccessToken, hasRequestAccessToken } from "./authToken";

describe("chooseRequestAccessToken", () => {
  it("prefers the Hosted UI token when both tokens are present", () => {
    expect(
      chooseRequestAccessToken({
        devAccessToken: "dev-token",
        hostedUiAccessToken: "hosted-token",
      }),
    ).toBe("hosted-token");
  });

  it("uses the development token when Hosted UI is not available", () => {
    expect(
      chooseRequestAccessToken({
        devAccessToken: "dev-token",
        hostedUiAccessToken: null,
      }),
    ).toBe("dev-token");
  });

  it("returns null when no usable token is available", () => {
    expect(
      chooseRequestAccessToken({
        devAccessToken: " ",
        hostedUiAccessToken: null,
      }),
    ).toBeNull();
  });

  it("detects whether a request token is available", () => {
    expect(
      hasRequestAccessToken({
        devAccessToken: "",
        hostedUiAccessToken: "hosted-token",
      }),
    ).toBe(true);
    expect(
      hasRequestAccessToken({
        devAccessToken: "dev-token",
        hostedUiAccessToken: null,
      }),
    ).toBe(true);
    expect(
      hasRequestAccessToken({
        devAccessToken: " ",
        hostedUiAccessToken: null,
      }),
    ).toBe(false);
  });
});
