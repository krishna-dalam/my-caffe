import {
  getCafeRedemptionUnavailableMessage,
  type Cafe,
  type CafeLandingView,
  type Customer,
  type Membership,
  type RedeemCoffeeResponse,
  type Redemption,
} from "@my-caffe/shared";
import type { CoffeeApi } from "./coffeeApi";

const sessionKey = "my-caffe.customer-session";

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

interface MockSession {
  customer: Customer | null;
  membership: Membership;
  redemptions: Redemption[];
}

interface MockStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

interface MockCoffeeApiOptions {
  codeGenerator?: () => string;
  delayMs?: number;
  idGenerator?: () => string;
  storage: MockStorage;
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

const readSession = (storage: MockStorage): MockSession => {
  const raw = storage.getItem(sessionKey);
  if (!raw) {
    return {
      customer: null,
      membership: initialMembership(),
      redemptions: [],
    };
  }

  return JSON.parse(raw) as MockSession;
};

const writeSession = (storage: MockStorage, session: MockSession): void => {
  storage.setItem(sessionKey, JSON.stringify(session));
};

const delay = async (delayMs: number): Promise<void> => {
  await new Promise((resolve) => globalThis.setTimeout(resolve, delayMs));
};

const makeVerificationCode = (): string => {
  const value = Math.floor(1000 + Math.random() * 9000);
  return value.toString();
};

const makeRedemptionId = (): string => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `redemption_${Date.now()}`;
};

export const createMockCoffeeApi = ({
  codeGenerator = makeVerificationCode,
  delayMs = 250,
  idGenerator = makeRedemptionId,
  storage,
}: MockCoffeeApiOptions): CoffeeApi => ({
  async completeLoginRedirect(): Promise<void> {
    await delay(delayMs);
    const session = readSession(storage);
    writeSession(storage, {
      ...session,
      customer: demoCustomer,
    });
  },

  async getCafeLanding(slug: string): Promise<CafeLandingView> {
    await delay(delayMs);

    if (slug !== demoCafe.slug) {
      throw new Error("Cafe not found.");
    }

    const session = readSession(storage);
    return {
      cafe: demoCafe,
      activeMembership: session.customer ? session.membership : null,
    };
  },

  async getCurrentCustomer(): Promise<Customer | null> {
    await delay(delayMs);
    return readSession(storage).customer;
  },

  async getRedemptions(cafeId: string): Promise<Redemption[]> {
    await delay(delayMs);
    const session = readSession(storage);
    return session.redemptions.filter((redemption) => redemption.cafeId === cafeId);
  },

  async loginWithGoogle(): Promise<Customer> {
    await delay(delayMs);
    const session = readSession(storage);
    const nextSession = {
      ...session,
      customer: demoCustomer,
    };
    writeSession(storage, nextSession);
    return demoCustomer;
  },

  async logout(): Promise<void> {
    await delay(delayMs);
    const session = readSession(storage);
    writeSession(storage, {
      ...session,
      customer: null,
    });
  },

  async resetDemoData(): Promise<void> {
    await delay(delayMs);
    storage.removeItem(sessionKey);
  },

  async redeemCoffee(cafeId: string): Promise<RedeemCoffeeResponse> {
    await delay(delayMs);
    const session = readSession(storage);

    if (!session.customer) {
      throw new Error("Login is required before redeeming coffee.");
    }

    if (session.membership.cafeId !== cafeId || session.membership.status !== "active") {
      throw new Error("No active subscription found for this cafe.");
    }

    if (demoCafe.status !== "active") {
      throw new Error(getCafeRedemptionUnavailableMessage(demoCafe.status));
    }

    if (session.membership.remainingCoffees <= 0) {
      throw new Error("No coffees remaining in this subscription.");
    }

    const nextMembership: Membership = {
      ...session.membership,
      remainingCoffees: session.membership.remainingCoffees - 1,
    };

    const redemption: Redemption = {
      redemptionId: idGenerator(),
      membershipId: nextMembership.membershipId,
      cafeId,
      verificationCode: codeGenerator(),
      redeemedAt: new Date().toISOString(),
      remainingCoffeesAfterRedeem: nextMembership.remainingCoffees,
    };

    writeSession(storage, {
      ...session,
      membership: nextMembership,
      redemptions: [redemption, ...session.redemptions],
    });

    return {
      redemption,
      membership: nextMembership,
    };
  },
});

export const mockCoffeeApi: CoffeeApi = createMockCoffeeApi({
  storage: {
    getItem: (key) => window.sessionStorage.getItem(key),
    removeItem: (key) => window.sessionStorage.removeItem(key),
    setItem: (key, value) => window.sessionStorage.setItem(key, value),
  },
});
