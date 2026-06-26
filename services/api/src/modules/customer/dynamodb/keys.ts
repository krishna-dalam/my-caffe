export const customerKeys = {
  cafeProfile: (cafeId: string) => ({
    pk: `CAFE#${cafeId}`,
    sk: "PROFILE",
  }),
  cafeSlugLookup: (slug: string) => ({
    pk: `CAFE_SLUG#${slug}`,
    sk: "PROFILE",
  }),
  customerProfile: (customerId: string) => ({
    pk: `CUSTOMER#${customerId}`,
    sk: "PROFILE",
  }),
  membership: (customerId: string, membershipId: string) => ({
    pk: `CUSTOMER#${customerId}`,
    sk: `MEMBERSHIP#${membershipId}`,
  }),
  redemption: (customerId: string, redemptionId: string) => ({
    pk: `CUSTOMER#${customerId}`,
    sk: `REDEMPTION#${redemptionId}`,
  }),
};

export const gsiKeys = {
  cafeMembership: (cafeId: string, membershipId: string) => ({
    gsi1pk: `CAFE#${cafeId}`,
    gsi1sk: `MEMBERSHIP#${membershipId}`,
  }),
  cafeRedemption: (cafeId: string, redeemedAt: string, redemptionId: string) => ({
    gsi1pk: `CAFE#${cafeId}`,
    gsi1sk: `REDEMPTION#${redeemedAt}#${redemptionId}`,
  }),
};
