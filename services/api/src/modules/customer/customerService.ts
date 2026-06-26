import type { CafeLandingView, Customer, RedeemCoffeeResponse, Redemption } from "@my-caffe/shared";
import { randomUUID } from "node:crypto";
import type { CustomerRepository } from "./customerRepository.js";

export type RedeemCoffeeErrorCode = "NO_ACTIVE_MEMBERSHIP" | "NO_REMAINING_COFFEES";

export class RedeemCoffeeError extends Error {
  constructor(
    readonly code: RedeemCoffeeErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface CustomerService {
  getCafeLanding(slug: string, isAuthenticated: boolean): Promise<CafeLandingView | null>;
  getCurrentCustomer(): Promise<Customer>;
  getRedemptions(cafeId: string): Promise<Redemption[]>;
  redeemCoffee(cafeId: string): Promise<RedeemCoffeeResponse>;
}

export const createCustomerService = (repository: CustomerRepository): CustomerService => ({
  async getCafeLanding(slug, isAuthenticated) {
    const cafe = await repository.findCafeBySlug(slug);
    if (!cafe) {
      return null;
    }

    return {
      cafe,
      activeMembership: isAuthenticated ? await repository.getMembershipForCafe(cafe.cafeId) : null,
    };
  },

  getCurrentCustomer() {
    return repository.getCurrentCustomer();
  },

  getRedemptions(cafeId) {
    return repository.listRedemptions(cafeId);
  },

  async redeemCoffee(cafeId) {
    const membership = await repository.getMembershipForCafe(cafeId);

    if (!membership || membership.status !== "active") {
      throw new RedeemCoffeeError("NO_ACTIVE_MEMBERSHIP", "No active subscription found for this cafe.");
    }

    if (membership.remainingCoffees <= 0) {
      throw new RedeemCoffeeError("NO_REMAINING_COFFEES", "No coffees remaining in this subscription.");
    }

    const nextMembership = {
      ...membership,
      remainingCoffees: membership.remainingCoffees - 1,
    };

    const redemption: Redemption = {
      cafeId,
      membershipId: nextMembership.membershipId,
      redeemedAt: new Date().toISOString(),
      redemptionId: randomUUID(),
      remainingCoffeesAfterRedeem: nextMembership.remainingCoffees,
      verificationCode: Math.floor(1000 + Math.random() * 9000).toString(),
    };

    await repository.saveMembership(nextMembership);
    await repository.saveRedemption(redemption);

    return {
      membership: nextMembership,
      redemption,
    };
  },
});
