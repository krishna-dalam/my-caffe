import type { Cafe } from "@my-caffe/shared";
import { describe, expect, it } from "vitest";
import { createCustomerService, RedeemCoffeeError } from "./customerService.js";
import { createMemoryCustomerRepository } from "./memoryCustomerRepository.js";

const cafeId = "cafe_demo_001";

const makeCafe = (status: Cafe["status"]): Cafe => ({
  area: "Indiranagar",
  cafeId: `cafe_${status}_001`,
  city: "Bengaluru",
  createdAt: "2026-01-01T00:00:00.000Z",
  name: `${status} Cafe`,
  slug: `${status}-cafe`,
  status,
  updatedAt: "2026-01-01T00:00:00.000Z",
});

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

  it("allows redemption for active cafes", async () => {
    const cafe = makeCafe("active");
    const service = createCustomerService(createMemoryCustomerRepository({ cafe }));

    const response = await service.redeemCoffee(cafe.cafeId);

    expect(response.membership.remainingCoffees).toBe(7);
    expect(response.redemption.cafeId).toBe(cafe.cafeId);
  });

  it("blocks redemption for draft cafes", async () => {
    const cafe = makeCafe("draft");
    const service = createCustomerService(createMemoryCustomerRepository({ cafe }));

    await expect(service.redeemCoffee(cafe.cafeId)).rejects.toThrow(RedeemCoffeeError);
    await expect(service.redeemCoffee(cafe.cafeId)).rejects.toMatchObject({
      code: "CAFE_NOT_ACTIVE",
      message: "This cafe is not accepting redemptions yet.",
    });
  });

  it("blocks redemption for inactive cafes", async () => {
    const cafe = makeCafe("inactive");
    const service = createCustomerService(createMemoryCustomerRepository({ cafe }));

    await expect(service.redeemCoffee(cafe.cafeId)).rejects.toThrow(RedeemCoffeeError);
    await expect(service.redeemCoffee(cafe.cafeId)).rejects.toMatchObject({
      code: "CAFE_NOT_ACTIVE",
      message: "This cafe is currently inactive.",
    });
  });

  it("creates current customer profile from authenticated claims when available", async () => {
    const service = createCustomerService(createMemoryCustomerRepository({ customerId: "cognito_customer_001" }));

    const customer = await service.getCurrentCustomer({
      customerId: "cognito_customer_001",
      displayName: "Customer One",
      email: "customer-one@example.com",
    });

    expect(customer).toEqual({
      customerId: "cognito_customer_001",
      displayName: "Customer One",
      email: "customer-one@example.com",
    });
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
