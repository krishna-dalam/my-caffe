export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "NO_ACTIVE_MEMBERSHIP"
  | "NO_REMAINING_COFFEES"
  | "UNKNOWN_ERROR";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  requestId: string;
}

export interface ApiSuccess<T> {
  data: T;
  requestId: string;
}

export type ApiResult<T> = ApiSuccess<T> | { error: ApiError };

export interface Cafe {
  cafeId: string;
  name: string;
  slug: string;
  address: string;
  isActive: boolean;
}

export interface Customer {
  customerId: string;
  displayName: string;
  email: string;
}

export interface SubscriptionPlan {
  planId: string;
  cafeId: string;
  name: string;
  coffeeCount: number;
  validityDays: number;
}

export type MembershipStatus = "active" | "expired" | "cancelled";

export interface Membership {
  membershipId: string;
  customerId: string;
  cafeId: string;
  planId: string;
  planName: string;
  status: MembershipStatus;
  totalCoffees: number;
  remainingCoffees: number;
  expiresAt: string;
}

export interface Redemption {
  redemptionId: string;
  membershipId: string;
  cafeId: string;
  verificationCode: string;
  redeemedAt: string;
  remainingCoffeesAfterRedeem: number;
}

export interface CafeLandingView {
  cafe: Cafe;
  activeMembership: Membership | null;
}

export interface RedeemCoffeeRequest {
  cafeId: string;
}

export interface RedeemCoffeeResponse {
  redemption: Redemption;
  membership: Membership;
}

export interface RedemptionHistoryView {
  redemptions: Redemption[];
}
