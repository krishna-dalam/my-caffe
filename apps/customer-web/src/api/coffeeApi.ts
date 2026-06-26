import type {
  CafeLandingView,
  Customer,
  RedeemCoffeeResponse,
} from "@my-caffe/shared";
import { env } from "../config/env";
import { mockCoffeeApi } from "./mockCoffeeApi";

export interface CoffeeApi {
  getCafeLanding(slug: string): Promise<CafeLandingView>;
  getCurrentCustomer(): Promise<Customer | null>;
  loginWithGoogle(): Promise<Customer>;
  logout(): Promise<void>;
  redeemCoffee(cafeId: string): Promise<RedeemCoffeeResponse>;
}

const jsonRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: {
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
  loginWithGoogle: () => {
    if (!env.cognitoDomain || !env.cognitoClientId) {
      throw new Error("Cognito Hosted UI is not configured.");
    }

    const params = new URLSearchParams({
      client_id: env.cognitoClientId,
      identity_provider: "Google",
      redirect_uri: env.cognitoRedirectUri,
      response_type: "code",
      scope: "openid email profile",
    });

    window.location.assign(`${env.cognitoDomain}/oauth2/authorize?${params.toString()}`);
    return new Promise<Customer>(() => undefined);
  },
  logout: () => Promise.resolve(),
  redeemCoffee: (cafeId) =>
    jsonRequest<RedeemCoffeeResponse>("/redemptions", {
      body: JSON.stringify({ cafeId }),
      method: "POST",
    }),
};

export const coffeeApi: CoffeeApi = env.useMockApi ? mockCoffeeApi : realCoffeeApi;
