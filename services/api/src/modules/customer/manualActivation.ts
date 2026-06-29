import type { Cafe, Customer, Membership } from "@my-caffe/shared";
import { customerKeys, gsiKeys } from "./dynamodb/keys.js";

export interface ManualActivationInput {
  cafeAddress: string;
  cafeId: string;
  cafeName: string;
  cafeSlug: string;
  coffeeCount: number;
  customerDisplayName: string;
  customerEmail: string;
  customerId: string;
  expiresAt: string;
  membershipId: string;
  planId: string;
  planName: string;
}

export type ActivationItem = Record<string, string | number | boolean>;

const toCafeItem = (cafe: Cafe, key: { pk: string; sk: string }): ActivationItem => ({
  ...cafe,
  PK: key.pk,
  SK: key.sk,
  entityType: "Cafe",
});

export const createManualActivationItems = (input: ManualActivationInput): ActivationItem[] => {
  const cafe: Cafe = {
    address: input.cafeAddress,
    cafeId: input.cafeId,
    isActive: true,
    name: input.cafeName,
    slug: input.cafeSlug,
  };
  const customer: Customer = {
    customerId: input.customerId,
    displayName: input.customerDisplayName,
    email: input.customerEmail,
  };
  const membership: Membership = {
    cafeId: input.cafeId,
    customerId: input.customerId,
    expiresAt: input.expiresAt,
    membershipId: input.membershipId,
    planId: input.planId,
    planName: input.planName,
    remainingCoffees: input.coffeeCount,
    status: "active",
    totalCoffees: input.coffeeCount,
  };

  const cafeProfileKey = customerKeys.cafeProfile(input.cafeId);
  const cafeSlugKey = customerKeys.cafeSlugLookup(input.cafeSlug);
  const customerProfileKey = customerKeys.customerProfile(input.customerId);
  const membershipKey = customerKeys.membership(input.customerId, input.membershipId);

  return [
    toCafeItem(cafe, cafeProfileKey),
    toCafeItem(cafe, cafeSlugKey),
    {
      ...customer,
      PK: customerProfileKey.pk,
      SK: customerProfileKey.sk,
      entityType: "Customer",
    },
    {
      ...membership,
      PK: membershipKey.pk,
      SK: membershipKey.sk,
      entityType: "Membership",
      ...gsiKeys.cafeMembership(input.cafeId, input.membershipId),
    },
  ];
};
