import {
  buildCafeQrDisplayUrl,
  buildCustomerRedeemUrl,
  generateCafeSlug,
  type Cafe,
  type CafeStatus,
  type Membership,
  type SubscriptionPlan,
} from "@my-caffe/shared";
import type { CustomerLookupResult } from "../customer/customerLookup.js";

export interface DevCafeSeedConfig {
  apiBaseUrl: string;
  cafeAddress: string;
  cafeArea: string;
  cafeCity: string;
  cafeName: string;
  cafeSlug?: string;
  cafeStatus: CafeStatus;
  coffeeCount: number;
  membershipId: string;
  planId: string;
  planName: string;
  tableName: string;
  webBaseUrl: string;
}

export interface DevCafeSeedSummary {
  cafe: Cafe;
  customer?: CustomerLookupResult;
  membership?: Membership;
  plan: SubscriptionPlan;
}

export const defaultDevCafeSeedValues = {
  apiBaseUrl: "https://api.dev.mycaffe.in/v1",
  cafeAddress: "Gachibowli, Hyderabad",
  cafeArea: "Gachibowli",
  cafeCity: "Hyderabad",
  cafeName: "Roast House Coffee",
  cafeSlug: "roast-house-coffee-gachibowli",
  cafeStatus: "active" satisfies CafeStatus,
  coffeeCount: 8,
  membershipId: "membership_dev_seed_001",
  planId: "plan_dev_seed_001",
  planName: "Monthly 8 Coffee Pass",
  webBaseUrl: "https://dev.mycaffe.in",
};

export const buildSeedSlug = (config: Pick<DevCafeSeedConfig, "cafeArea" | "cafeCity" | "cafeName" | "cafeSlug">): string =>
  config.cafeSlug?.trim() || generateCafeSlug({ area: config.cafeArea, city: config.cafeCity, name: config.cafeName });

export const slugWithAttempt = (baseSlug: string, attempt: number): string => (attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`);

export const buildSeedCafe = ({
  cafeId,
  config,
  now,
  slug,
}: {
  cafeId: string;
  config: DevCafeSeedConfig;
  now: string;
  slug: string;
}): Cafe => ({
  address: config.cafeAddress,
  area: config.cafeArea,
  cafeId,
  city: config.cafeCity,
  createdAt: now,
  customerRedeemUrl: buildCustomerRedeemUrl(config.webBaseUrl, slug),
  name: config.cafeName,
  qrDisplayUrl: buildCafeQrDisplayUrl(config.webBaseUrl, slug),
  slug,
  status: config.cafeStatus,
  updatedAt: now,
});

export const buildSeedPlan = (config: DevCafeSeedConfig, cafeId: string): SubscriptionPlan => ({
  cafeId,
  coffeeCount: config.coffeeCount,
  name: config.planName,
  planId: config.planId,
  validityDays: 30,
});

export const defaultExpiry = (from = new Date()): string => {
  const expiresAt = new Date(from);
  expiresAt.setDate(expiresAt.getDate() + 30);
  return expiresAt.toISOString();
};

export const buildSeedMembership = ({
  cafe,
  config,
  customer,
  expiresAt,
}: {
  cafe: Cafe;
  config: DevCafeSeedConfig;
  customer: CustomerLookupResult;
  expiresAt: string;
}): Membership => ({
  cafeId: cafe.cafeId,
  customerId: customer.customerId,
  expiresAt,
  membershipId: config.membershipId,
  planId: config.planId,
  planName: config.planName,
  remainingCoffees: config.coffeeCount,
  status: "active",
  totalCoffees: config.coffeeCount,
});

export const formatDevCafeSeedSummary = ({ cafe, customer, membership, plan }: DevCafeSeedSummary): string[] => [
  "Cafe created:",
  `Name: ${cafe.name}`,
  `Status: ${cafe.status}`,
  `QR poster: ${cafe.qrDisplayUrl ?? buildCafeQrDisplayUrl(defaultDevCafeSeedValues.webBaseUrl, cafe.slug)}`,
  `Customer redeem: ${cafe.customerRedeemUrl ?? buildCustomerRedeemUrl(defaultDevCafeSeedValues.webBaseUrl, cafe.slug)}`,
  `Plan: ${plan.name} (${plan.coffeeCount} coffees, ${plan.validityDays} days)`,
  membership && customer
    ? `Membership activated: ${customer.email} (${membership.remainingCoffees}/${membership.totalCoffees} coffees)`
    : "Membership activated: skipped; set CUSTOMER_EMAIL to activate an existing customer.",
];

