import type { Cafe, Customer, Membership, Redemption } from "@my-caffe/shared";

export interface CustomerRepository {
  findCafeBySlug(slug: string): Promise<Cafe | null>;
  getCurrentCustomer(): Promise<Customer>;
  getMembershipForCafe(cafeId: string): Promise<Membership | null>;
  listRedemptions(cafeId: string): Promise<Redemption[]>;
  saveMembership(membership: Membership): Promise<void>;
  saveRedemption(redemption: Redemption): Promise<void>;
}
