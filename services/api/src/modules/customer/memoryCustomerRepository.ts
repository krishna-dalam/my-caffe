import type { Cafe, Customer, Membership, Redemption } from "@my-caffe/shared";
import type { CustomerProfileInput, CustomerRepository } from "./customerRepository.js";

const demoCafe: Cafe = {
  area: "Indiranagar",
  cafeId: "cafe_demo_001",
  city: "Bengaluru",
  createdAt: "2026-01-01T00:00:00.000Z",
  name: "Blue Bottle Demo Cafe",
  slug: "blue-bottle-demo",
  status: "active",
  updatedAt: "2026-01-01T00:00:00.000Z",
  address: "Indiranagar, Bengaluru",
};

const demoCustomer: Customer = {
  customerId: "customer_demo_001",
  displayName: "Aarav Mehta",
  email: "aarav@example.com",
};

interface MemoryCustomerRepositoryOptions {
  cafe?: Cafe;
  customerId?: string;
}

const makeCustomer = (customerId: string): Customer =>
  customerId === demoCustomer.customerId
    ? demoCustomer
    : {
        customerId,
        displayName: "Coffee Member",
        email: `${customerId}@example.test`,
      };

const makeCustomerFromProfile = (profile: CustomerProfileInput): Customer => ({
  customerId: profile.customerId,
  displayName: profile.displayName ?? "Coffee Member",
  email: profile.email ?? `${profile.customerId}@example.test`,
});

const makeMembership = (customerId: string, cafeId = demoCafe.cafeId): Membership => ({
  membershipId: "membership_demo_001",
  customerId,
  cafeId,
  planId: "plan_demo_001",
  planName: "Monthly 8 Coffee Pass",
  status: "active",
  totalCoffees: 8,
  remainingCoffees: 8,
  expiresAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
});

export const createMemoryCustomerRepository = ({
  cafe = demoCafe,
  customerId = demoCustomer.customerId,
}: MemoryCustomerRepositoryOptions = {}): CustomerRepository => {
  let customer = makeCustomer(customerId);
  let membership = makeMembership(customer.customerId, cafe.cafeId);
  let redemptions: Redemption[] = [];

  return {
    async commitRedemption(_currentMembership, nextMembership, redemption) {
      membership = nextMembership;
      redemptions = [redemption, ...redemptions];
    },

    async findCafeBySlug(slug) {
      return slug === cafe.slug ? cafe : null;
    },

    async getCafeById(cafeId) {
      return cafe.cafeId === cafeId ? cafe : null;
    },

    async getCurrentCustomer() {
      return customer;
    },

    async getOrCreateCurrentCustomer(profile) {
      if (customer.customerId !== profile.customerId) {
        customer = makeCustomerFromProfile(profile);
      } else {
        customer = {
          ...customer,
          displayName: profile.displayName ?? customer.displayName,
          email: profile.email ?? customer.email,
        };
      }

      return customer;
    },

    async getMembershipForCafe(cafeId) {
      return membership.cafeId === cafeId ? membership : null;
    },

    async listRedemptions(cafeId) {
      return redemptions.filter((redemption) => redemption.cafeId === cafeId);
    },

  };
};
