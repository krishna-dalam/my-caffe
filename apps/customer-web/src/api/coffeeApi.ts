import type {
  CafeLandingView,
  Customer,
  RedeemCoffeeResponse,
  Redemption,
} from "@my-caffe/shared";
import {
  completeHostedUiCallback,
  getAccessToken,
  logoutFromHostedUi,
  startGoogleLogin,
} from "../auth/cognito";
import { env } from "../config/env";
import { mockCoffeeApi } from "./mockCoffeeApi";

export interface CoffeeApi {
  getCafeLanding(slug: string): Promise<CafeLandingView>;
  getCurrentCustomer(): Promise<Customer | null>;
  getRedemptions(cafeId: string): Promise<Redemption[]>;
  completeLoginRedirect(): Promise<void>;
  loginWithGoogle(): Promise<Customer>;
  logout(): Promise<void>;
  redeemCoffee(cafeId: string): Promise<RedeemCoffeeResponse>;
  resetDemoData(): Promise<void>;
}

const jsonRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const accessToken = getAccessToken();
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
};

const realCoffeeApi: CoffeeApi = {
  getCafeLanding: (slug) => jsonRequest<CafeLandingView>(`/cafes/${slug}`),
  getCurrentCustomer: () => jsonRequest<Customer | null>("/me"),
  getRedemptions: (cafeId) => jsonRequest<Redemption[]>(`/me/redemptions?cafeId=${encodeURIComponent(cafeId)}`),
  completeLoginRedirect: () =>
    completeHostedUiCallback({
      clientId: env.cognitoClientId,
      domain: env.cognitoDomain,
      redirectUri: env.cognitoRedirectUri,
    }),
  loginWithGoogle: async () => {
    await startGoogleLogin({
      clientId: env.cognitoClientId,
      domain: env.cognitoDomain,
      redirectUri: env.cognitoRedirectUri,
    });
    return new Promise<Customer>(() => undefined);
  },
  logout: () => {
    logoutFromHostedUi({
      clientId: env.cognitoClientId,
      domain: env.cognitoDomain,
      redirectUri: env.cognitoRedirectUri,
    });
    return Promise.resolve();
  },
  redeemCoffee: (cafeId) =>
    jsonRequest<RedeemCoffeeResponse>("/redemptions", {
      body: JSON.stringify({ cafeId }),
      method: "POST",
    }),
  resetDemoData: () => Promise.resolve(),
};

export const coffeeApi: CoffeeApi = env.useMockApi ? mockCoffeeApi : realCoffeeApi;
