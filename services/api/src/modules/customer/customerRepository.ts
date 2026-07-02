import type { Cafe, Customer, Membership, Redemption } from "@my-caffe/shared";

export interface CustomerProfileInput {
  customerId: string;
  displayName?: string;
  email?: string;
}

export interface CustomerRepository {
  commitRedemption(currentMembership: Membership, nextMembership: Membership, redemption: Redemption): Promise<void>;
  getCafeById(cafeId: string): Promise<Cafe | null>;
  findCafeBySlug(slug: string): Promise<Cafe | null>;
  getCurrentCustomer(): Promise<Customer>;
  getOrCreateCurrentCustomer(profile: CustomerProfileInput): Promise<Customer>;
  getMembershipForCafe(cafeId: string): Promise<Membership | null>;
  listRedemptions(cafeId: string): Promise<Redemption[]>;
}
