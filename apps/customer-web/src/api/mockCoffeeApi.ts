import type {
  Cafe,
  CafeLandingView,
  Customer,
  Membership,
  RedeemCoffeeResponse,
  Redemption,
} from "@my-caffe/shared";
import type { CoffeeApi } from "./coffeeApi";

const sessionKey = "my-caffe.customer-session";

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

interface MockSession {
  customer: Customer | null;
  membership: Membership;
  redemptions: Redemption[];
}

const initialMembership = (): Membership => ({
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

const readSession = (): MockSession => {
  const raw = window.sessionStorage.getItem(sessionKey);
  if (!raw) {
    return {
      customer: null,
      membership: initialMembership(),
      redemptions: [],
    };
  }

  return JSON.parse(raw) as MockSession;
};

const writeSession = (session: MockSession): void => {
  window.sessionStorage.setItem(sessionKey, JSON.stringify(session));
};

const delay = async (): Promise<void> => {
  await new Promise((resolve) => window.setTimeout(resolve, 250));
};

const makeVerificationCode = (): string => {
  const value = Math.floor(1000 + Math.random() * 9000);
  return value.toString();
};

export const mockCoffeeApi: CoffeeApi = {
  async getCafeLanding(slug: string): Promise<CafeLandingView> {
    await delay();

    if (slug !== demoCafe.slug) {
      throw new Error("Cafe not found.");
    }

    const session = readSession();
    return {
      cafe: demoCafe,
      activeMembership: session.customer ? session.membership : null,
    };
  },

  async getCurrentCustomer(): Promise<Customer | null> {
    await delay();
    return readSession().customer;
  },

  async loginWithGoogle(): Promise<Customer> {
    await delay();
    const session = readSession();
    const nextSession = {
      ...session,
      customer: demoCustomer,
    };
    writeSession(nextSession);
    return demoCustomer;
  },

  async logout(): Promise<void> {
    await delay();
    const session = readSession();
    writeSession({
      ...session,
      customer: null,
    });
  },

  async redeemCoffee(cafeId: string): Promise<RedeemCoffeeResponse> {
    await delay();
    const session = readSession();

    if (!session.customer) {
      throw new Error("Login is required before redeeming coffee.");
    }

    if (session.membership.cafeId !== cafeId || session.membership.status !== "active") {
      throw new Error("No active subscription found for this cafe.");
    }

    if (session.membership.remainingCoffees <= 0) {
      throw new Error("No coffees remaining in this subscription.");
    }

    const nextMembership: Membership = {
      ...session.membership,
      remainingCoffees: session.membership.remainingCoffees - 1,
    };

    const redemption: Redemption = {
      redemptionId: crypto.randomUUID(),
      membershipId: nextMembership.membershipId,
      cafeId,
      verificationCode: makeVerificationCode(),
      redeemedAt: new Date().toISOString(),
      remainingCoffeesAfterRedeem: nextMembership.remainingCoffees,
    };

    writeSession({
      ...session,
      membership: nextMembership,
      redemptions: [redemption, ...session.redemptions],
    });

    return {
      redemption,
      membership: nextMembership,
    };
  },
};
