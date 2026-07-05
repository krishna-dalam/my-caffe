import type { Cafe, Customer, Membership, Redemption } from "@my-caffe/shared";
import type { CustomerProfileInput, CustomerRepository } from "./customerRepository.js";
import { createMemoryCafeStore, demoCafe, type MemoryCafeStore } from "./memoryCafeStore.js";

const demoCustomer: Customer = {
  customerId: "customer_demo_001",
  displayName: "Aarav Mehta",
  email: "aarav@example.com",
};

interface MemoryCustomerRepositoryOptions {
  cafe?: Cafe;
  cafeStore?: MemoryCafeStore;
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
  cafeStore = createMemoryCafeStore([cafe]),
  customerId = demoCustomer.customerId,
}: MemoryCustomerRepositoryOptions = {}): CustomerRepository => {
  let customer = makeCustomer(customerId);
  const membershipsByCafeId = new Map<string, Membership>([[cafe.cafeId, makeMembership(customer.customerId, cafe.cafeId)]]);
  let redemptions: Redemption[] = [];

  const getOrCreateMembership = (cafeId: string): Membership | null => {
    if (!cafeStore.getCafe(cafeId)) {
      return null;
    }

    const existingMembership = membershipsByCafeId.get(cafeId);
    if (existingMembership) {
      return existingMembership;
    }

    const membership = makeMembership(customer.customerId, cafeId);
    membershipsByCafeId.set(cafeId, membership);
    return membership;
  };

  return {
    async commitRedemption(_currentMembership, nextMembership, redemption) {
      membershipsByCafeId.set(nextMembership.cafeId, nextMembership);
      redemptions = [redemption, ...redemptions];
    },

    async findCafeBySlug(slug) {
      return cafeStore.findCafeBySlug(slug);
    },

    async getCafeById(cafeId) {
      return cafeStore.getCafe(cafeId);
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
      return getOrCreateMembership(cafeId);
    },

    async listRedemptions(cafeId) {
      return redemptions.filter((redemption) => redemption.cafeId === cafeId);
    },

  };
};
