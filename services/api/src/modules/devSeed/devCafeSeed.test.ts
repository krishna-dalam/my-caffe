import { describe, expect, it } from "vitest";
import {
  buildSeedCafe,
  buildSeedMembership,
  buildSeedPlan,
  buildSeedSlug,
  defaultDevCafeSeedValues,
  formatDevCafeSeedSummary,
  slugWithAttempt,
  type DevCafeSeedConfig,
} from "./devCafeSeed.js";

const config: DevCafeSeedConfig = {
  ...defaultDevCafeSeedValues,
  tableName: "CoffeeTable",
};

describe("dev cafe seed helpers", () => {
  it("uses the explicit sample slug and appends deterministic retry suffixes", () => {
    expect(buildSeedSlug(config)).toBe("roast-house-coffee-gachibowli");
    expect(slugWithAttempt("roast-house-coffee-gachibowli", 0)).toBe("roast-house-coffee-gachibowli");
    expect(slugWithAttempt("roast-house-coffee-gachibowli", 1)).toBe("roast-house-coffee-gachibowli-2");
  });

  it("builds cafe links from the configured web base URL", () => {
    const cafe = buildSeedCafe({
      cafeId: "cafe_seed_001",
      config,
      now: "2026-07-05T00:00:00.000Z",
      slug: "roast-house-coffee-gachibowli",
    });

    expect(cafe).toMatchObject({
      customerRedeemUrl: "https://dev.mycaffe.in/c/roast-house-coffee-gachibowli",
      qrDisplayUrl: "https://dev.mycaffe.in/qr/roast-house-coffee-gachibowli",
      status: "active",
    });
  });

  it("builds a membership summary when customer activation is requested", () => {
    const cafe = buildSeedCafe({
      cafeId: "cafe_seed_001",
      config,
      now: "2026-07-05T00:00:00.000Z",
      slug: "roast-house-coffee-gachibowli",
    });
    const customer = { customerId: "customer_001", email: "user@example.com", displayName: "User" };
    const membership = buildSeedMembership({
      cafe,
      config,
      customer,
      expiresAt: "2026-08-04T00:00:00.000Z",
    });

    expect(formatDevCafeSeedSummary({ cafe, customer, membership, plan: buildSeedPlan(config, cafe.cafeId) })).toContain(
      "Membership activated: user@example.com (8/8 coffees)",
    );
  });
});

