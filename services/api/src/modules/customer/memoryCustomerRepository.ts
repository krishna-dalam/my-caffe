import type { Cafe, Customer, Membership, Redemption } from "@my-caffe/shared";
import type { CustomerRepository } from "./customerRepository.js";

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

export const createMemoryCustomerRepository = (): CustomerRepository => {
  let membership = makeMembership();
  let redemptions: Redemption[] = [];

  return {
    async findCafeBySlug(slug) {
      return slug === demoCafe.slug ? demoCafe : null;
    },

    async getCurrentCustomer() {
      return demoCustomer;
    },

    async getMembershipForCafe(cafeId) {
      return membership.cafeId === cafeId ? membership : null;
    },

    async listRedemptions(cafeId) {
      return redemptions.filter((redemption) => redemption.cafeId === cafeId);
    },

    async saveMembership(nextMembership) {
      membership = nextMembership;
    },

    async saveRedemption(redemption) {
      redemptions = [redemption, ...redemptions];
    },
  };
};
