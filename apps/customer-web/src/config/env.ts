interface CustomerWebEnv {
  appName: string;
  apiBaseUrl: string;
  webBaseUrl: string;
  useMockApi: boolean;
  cognitoDomain: string;
  cognitoClientId: string;
  cognitoRedirectUri: string;
  devAccessToken: string;
}

type RuntimeConfig = Partial<Omit<CustomerWebEnv, "devAccessToken">>;

const readEnv = (key: string): string | undefined => {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
};

const getDefaultRedirectUri = (): string => {
  if (typeof window === "undefined") {
    return "http://localhost:5173/auth/callback";
  }

  return window.location.origin + "/auth/callback";
};

const isRuntimeConfig = (value: unknown): value is RuntimeConfig => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const config = value as Record<string, unknown>;
  return Object.values(config).every((item) => ["boolean", "number", "string", "undefined"].includes(typeof item));
};

export const env: CustomerWebEnv = {
  appName: readEnv("VITE_APP_NAME") ?? "My Caffe",
  apiBaseUrl: readEnv("VITE_API_BASE_URL") ?? "http://localhost:3000/v1",
  webBaseUrl: readEnv("VITE_WEB_BASE_URL") ?? (typeof window === "undefined" ? "http://localhost:5173" : window.location.origin),
  useMockApi: readEnv("VITE_USE_MOCK_API") !== "false",
  cognitoDomain: readEnv("VITE_COGNITO_DOMAIN") ?? "",
  cognitoClientId: readEnv("VITE_COGNITO_CLIENT_ID") ?? "",
  cognitoRedirectUri: readEnv("VITE_COGNITO_REDIRECT_URI") ?? getDefaultRedirectUri(),
  devAccessToken: readEnv("VITE_DEV_ACCESS_TOKEN") ?? "",
};

export const applyRuntimeConfig = (config: RuntimeConfig): void => {
  if (typeof config.appName === "string" && config.appName.trim().length > 0) {
    env.appName = config.appName;
  }

  if (typeof config.apiBaseUrl === "string" && config.apiBaseUrl.trim().length > 0) {
    env.apiBaseUrl = config.apiBaseUrl;
  }

  if (typeof config.webBaseUrl === "string" && config.webBaseUrl.trim().length > 0) {
    env.webBaseUrl = config.webBaseUrl;
  }

  if (typeof config.useMockApi === "boolean") {
    env.useMockApi = config.useMockApi;
  }

  if (typeof config.cognitoDomain === "string") {
    env.cognitoDomain = config.cognitoDomain;
  }

  if (typeof config.cognitoClientId === "string") {
    env.cognitoClientId = config.cognitoClientId;
  }

  if (typeof config.cognitoRedirectUri === "string" && config.cognitoRedirectUri.trim().length > 0) {
    env.cognitoRedirectUri = config.cognitoRedirectUri;
  }
};

export const loadRuntimeConfig = async (configUrl = "/config.json"): Promise<void> => {
  try {
    const response = await fetch(configUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const config = (await response.json()) as unknown;
    if (isRuntimeConfig(config)) {
      applyRuntimeConfig(config);
    }
  } catch {
    // Local development does not need a runtime config file.
  }
};
