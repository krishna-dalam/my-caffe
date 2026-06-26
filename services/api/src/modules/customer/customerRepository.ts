import type { Cafe, Customer, Membership, Redemption } from "@my-caffe/shared";

export interface CustomerRepository {
  commitRedemption(currentMembership: Membership, nextMembership: Membership, redemption: Redemption): Promise<void>;
  findCafeBySlug(slug: string): Promise<Cafe | null>;
  getCurrentCustomer(): Promise<Customer>;
  getMembershipForCafe(cafeId: string): Promise<Membership | null>;
  listRedemptions(cafeId: string): Promise<Redemption[]>;
}
