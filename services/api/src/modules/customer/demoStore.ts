import type {
  Cafe,
  CafeLandingView,
  Customer,
  Membership,
  RedeemCoffeeResponse,
  Redemption,
} from "@my-caffe/shared";
import { randomUUID } from "node:crypto";

const demoCafe: Cafe = {
  cafeId: "cafe_demo_001",
  name: "Blue Bottle Demo Cafe",
  slug: "blue-bottle-demo",
  address: "Indiranagar, Bengaluru",
  isActive: true,
};

const demoCustomer: Customer = {
  customerId: "customer_demo_001",
  displayName: "Aarav Mehta",
  email: "aarav@example.com",
};

const makeMembership = (): Membership => ({
  membershipId: "membership_demo_001",
  customerId: demoCustomer.customerId,
  cafeId: demoCafe.cafeId,
  planId: "plan_demo_001",
  planName: "Monthly 8 Coffee Pass",
  status: "active",
  totalCoffees: 8,
  remainingCoffees: 8,
  expiresAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
});

export interface DemoStore {
  getCafeLanding(slug: string, isAuthenticated: boolean): CafeLandingView | null;
  getCustomer(): Customer;
  getRedemptions(cafeId: string): Redemption[];
  redeemCoffee(cafeId: string): RedeemCoffeeResponse;
  reset(): void;
}

export const createDemoStore = (): DemoStore => {
  let membership = makeMembership();
  let redemptions: Redemption[] = [];

  return {
    getCafeLanding(slug, isAuthenticated) {
      if (slug !== demoCafe.slug) {
        return null;
      }

      return {
        cafe: demoCafe,
        activeMembership: isAuthenticated ? membership : null,
      };
    },

    getCustomer() {
      return demoCustomer;
    },

    getRedemptions(cafeId) {
      return redemptions.filter((redemption) => redemption.cafeId === cafeId);
    },

    redeemCoffee(cafeId) {
      if (membership.cafeId !== cafeId || membership.status !== "active") {
        throw new Error("No active subscription found for this cafe.");
      }

      if (membership.remainingCoffees <= 0) {
        throw new Error("No coffees remaining in this subscription.");
      }

      membership = {
        ...membership,
        remainingCoffees: membership.remainingCoffees - 1,
      };

      const redemption: Redemption = {
        cafeId,
        membershipId: membership.membershipId,
        redeemedAt: new Date().toISOString(),
        redemptionId: randomUUID(),
        remainingCoffeesAfterRedeem: membership.remainingCoffees,
        verificationCode: Math.floor(1000 + Math.random() * 9000).toString(),
      };

      redemptions = [redemption, ...redemptions];

      return {
        membership,
        redemption,
      };
    },

    reset() {
      membership = makeMembership();
      redemptions = [];
    },
  };
};
