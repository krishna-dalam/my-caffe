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
import { chooseRequestAccessToken } from "./authToken";
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
  const accessToken = chooseRequestAccessToken({
    devAccessToken: env.devAccessToken,
    hostedUiAccessToken: getAccessToken(),
  });
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

  const payload = (await response.json()) as T | { data: T };
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data;
  }

  return payload;
};

const realCoffeeApi: CoffeeApi = {
  getCafeLanding: (slug) => jsonRequest<CafeLandingView>(`/cafes/${slug}`),
  getCurrentCustomer: () => jsonRequest<Customer | null>("/me"),
  getRedemptions: (cafeId) => jsonRequest<Redemption[]>(`/me/redemptions?cafeId=${encodeURIComponent(cafeId)}`),
  completeLoginRedirect: () => {
    if (env.devAccessToken) {
      return Promise.resolve();
    }

    return completeHostedUiCallback({
      clientId: env.cognitoClientId,
      domain: env.cognitoDomain,
      redirectUri: env.cognitoRedirectUri,
    });
  },
  loginWithGoogle: async () => {
    if (env.devAccessToken) {
      return jsonRequest<Customer>("/me");
    }

    await startGoogleLogin({
      clientId: env.cognitoClientId,
      domain: env.cognitoDomain,
      redirectUri: env.cognitoRedirectUri,
    });
    return new Promise<Customer>(() => undefined);
  },
  logout: () => {
    if (env.devAccessToken) {
      return Promise.resolve();
    }

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
