import { CAFE_STATUSES, type Cafe, type CafeStatus, type CreateCafeInput, type UpdateCafeInput } from "@my-caffe/shared";
import { getAccessToken, startGoogleLogin } from "../auth/cognito";
import { env } from "../config/env";
import { jsonRequest } from "./httpClient";

export interface AdminCafeListResponse {
  cafes: Cafe[];
}

export const cafeStatuses: readonly CafeStatus[] = CAFE_STATUSES;

const getRequestAccessToken = (): string | null => getAccessToken() ?? (env.devAccessToken.trim() || null);

const adminJsonRequest = <T>(path: string, init?: RequestInit): Promise<T> =>
  jsonRequest<T>({
    accessToken: getRequestAccessToken(),
    apiBaseUrl: env.apiBaseUrl,
    init,
    path,
  });

export const hasAdminAccessToken = (): boolean => getRequestAccessToken() !== null;

export const loginWithGoogle = async (): Promise<void> => {
  if (env.devAccessToken) {
    return;
  }

  await startGoogleLogin(
    {
      clientId: env.cognitoClientId,
      domain: env.cognitoDomain,
      redirectUri: env.cognitoRedirectUri,
    },
    window.location.pathname,
  );
};

export const adminCafeApi = {
  createCafe(input: CreateCafeInput): Promise<Cafe> {
    return adminJsonRequest<Cafe>("/admin/cafes", {
      body: JSON.stringify(input),
      method: "POST",
    });
  },

  getCafe(cafeId: string): Promise<Cafe> {
    return adminJsonRequest<Cafe>(`/admin/cafes/${encodeURIComponent(cafeId)}`);
  },

  listCafes(): Promise<AdminCafeListResponse> {
    return adminJsonRequest<AdminCafeListResponse>("/admin/cafes");
  },

  updateCafe(cafeId: string, input: UpdateCafeInput): Promise<Cafe> {
    return adminJsonRequest<Cafe>(`/admin/cafes/${encodeURIComponent(cafeId)}`, {
      body: JSON.stringify(input),
      method: "PATCH",
    });
  },
};
