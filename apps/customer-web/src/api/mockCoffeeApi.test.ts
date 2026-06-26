import { beforeEach, describe, expect, it } from "vitest";
import { createMockCoffeeApi } from "./mockCoffeeApi";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const cafeId = "cafe_demo_001";

describe("mockCoffeeApi", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  const makeApi = () =>
    createMockCoffeeApi({
      codeGenerator: () => "1234",
      delayMs: 0,
      idGenerator: () => "redemption_test_001",
      storage,
    });

  it("requires login before exposing an active membership", async () => {
    const api = makeApi();

    const guestView = await api.getCafeLanding("blue-bottle-demo");
    expect(guestView.activeMembership).toBeNull();

    const customer = await api.loginWithGoogle();
    const customerView = await api.getCafeLanding("blue-bottle-demo");

    expect(customer.email).toBe("aarav@example.com");
    expect(customerView.activeMembership?.remainingCoffees).toBe(8);
  });

  it("redeems one coffee, returns a verification code, and records history", async () => {
    const api = makeApi();
    await api.loginWithGoogle();

    const response = await api.redeemCoffee(cafeId);
    const redemptions = await api.getRedemptions(cafeId);

    expect(response.redemption.verificationCode).toBe("1234");
    expect(response.membership.remainingCoffees).toBe(7);
    expect(redemptions).toHaveLength(1);
    expect(redemptions[0]?.remainingCoffeesAfterRedeem).toBe(7);
  });

  it("does not redeem when the customer is signed out", async () => {
    const api = makeApi();

    await expect(api.redeemCoffee(cafeId)).rejects.toThrow("Login is required");
  });

  it("stops redemption when coffees are exhausted", async () => {
    const api = makeApi();
    await api.loginWithGoogle();

    for (let index = 0; index < 8; index += 1) {
      await api.redeemCoffee(cafeId);
    }

    await expect(api.redeemCoffee(cafeId)).rejects.toThrow("No coffees remaining");
  });

  it("resets demo data for repeatable local testing", async () => {
    const api = makeApi();
    await api.loginWithGoogle();
    await api.redeemCoffee(cafeId);
    await api.resetDemoData();

    expect(await api.getCurrentCustomer()).toBeNull();
    expect(await api.getRedemptions(cafeId)).toHaveLength(0);
  });
});
