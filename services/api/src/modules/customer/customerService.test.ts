import { describe, expect, it } from "vitest";
import { createCustomerService, RedeemCoffeeError } from "./customerService.js";
import { createMemoryCustomerRepository } from "./memoryCustomerRepository.js";

const cafeId = "cafe_demo_001";

describe("customerService", () => {
  it("hides membership from unauthenticated cafe landing views", async () => {
    const service = createCustomerService(createMemoryCustomerRepository());

    const guestView = await service.getCafeLanding("blue-bottle-demo", false);
    const customerView = await service.getCafeLanding("blue-bottle-demo", true);

    expect(guestView?.activeMembership).toBeNull();
    expect(customerView?.activeMembership?.remainingCoffees).toBe(8);
  });

  it("redeems one coffee and stores redemption history", async () => {
    const service = createCustomerService(createMemoryCustomerRepository());

    const response = await service.redeemCoffee(cafeId);
    const redemptions = await service.getRedemptions(cafeId);

    expect(response.membership.remainingCoffees).toBe(7);
    expect(response.redemption.verificationCode).toMatch(/^\d{4}$/);
    expect(redemptions).toHaveLength(1);
    expect(redemptions[0]?.remainingCoffeesAfterRedeem).toBe(7);
  });

  it("blocks redemption when coffee count is exhausted", async () => {
    const service = createCustomerService(createMemoryCustomerRepository());

    for (let index = 0; index < 8; index += 1) {
      await service.redeemCoffee(cafeId);
    }

    await expect(service.redeemCoffee(cafeId)).rejects.toThrow(RedeemCoffeeError);
    await expect(service.redeemCoffee(cafeId)).rejects.toMatchObject({
      code: "NO_REMAINING_COFFEES",
    });
  });
});
