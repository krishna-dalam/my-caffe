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
import { chooseRequestAccessToken, hasRequestAccessToken } from "./authToken";
import { jsonRequest } from "./httpClient";
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

const realJsonRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const accessToken = chooseRequestAccessToken({
    devAccessToken: env.devAccessToken,
    hostedUiAccessToken: getAccessToken(),
  });

  return jsonRequest<T>({
    accessToken,
    apiBaseUrl: env.apiBaseUrl,
    init,
    path,
  });
};

const realCoffeeApi: CoffeeApi = {
  getCafeLanding: (slug) => realJsonRequest<CafeLandingView>(`/cafes/${slug}`),
  getCurrentCustomer: () => {
    if (
      !hasRequestAccessToken({
        devAccessToken: env.devAccessToken,
        hostedUiAccessToken: getAccessToken(),
      })
    ) {
      return Promise.resolve(null);
    }

    return realJsonRequest<Customer | null>("/me");
  },
  getRedemptions: (cafeId) => realJsonRequest<Redemption[]>(`/me/redemptions?cafeId=${encodeURIComponent(cafeId)}`),
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
      return realJsonRequest<Customer>("/me");
    }

    await startGoogleLogin(
      {
        clientId: env.cognitoClientId,
        domain: env.cognitoDomain,
        redirectUri: env.cognitoRedirectUri,
      },
      window.location.pathname,
    );
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
    realJsonRequest<RedeemCoffeeResponse>("/redemptions", {
      body: JSON.stringify({ cafeId }),
      method: "POST",
    }),
  resetDemoData: () => Promise.resolve(),
};

export const coffeeApi: CoffeeApi = env.useMockApi ? mockCoffeeApi : realCoffeeApi;
