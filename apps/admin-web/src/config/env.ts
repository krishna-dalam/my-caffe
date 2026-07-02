interface AdminWebEnv {
  apiBaseUrl: string;
  appName: string;
  cognitoClientId: string;
  cognitoDomain: string;
  cognitoRedirectUri: string;
  devAccessToken: string;
}

type RuntimeConfig = Partial<Omit<AdminWebEnv, "devAccessToken">>;

const readEnv = (key: string): string | undefined => {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
};

const getDefaultRedirectUri = (): string => {
  if (typeof window === "undefined") {
    return "http://localhost:5174/auth/callback";
  }

  return window.location.origin + "/auth/callback";
};

const isRuntimeConfig = (value: unknown): value is RuntimeConfig => {
  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.values(value).every((item) => ["boolean", "number", "string", "undefined"].includes(typeof item));
};

export const env: AdminWebEnv = {
  apiBaseUrl: readEnv("VITE_API_BASE_URL") ?? "http://localhost:3000/v1",
  appName: readEnv("VITE_APP_NAME") ?? "My Caffe Admin",
  cognitoClientId: readEnv("VITE_COGNITO_CLIENT_ID") ?? "",
  cognitoDomain: readEnv("VITE_COGNITO_DOMAIN") ?? "",
  cognitoRedirectUri: readEnv("VITE_COGNITO_REDIRECT_URI") ?? getDefaultRedirectUri(),
  devAccessToken: readEnv("VITE_DEV_ACCESS_TOKEN") ?? "",
};

export const applyRuntimeConfig = (config: RuntimeConfig): void => {
  if (typeof config.apiBaseUrl === "string" && config.apiBaseUrl.trim().length > 0) {
    env.apiBaseUrl = config.apiBaseUrl;
  }

  if (typeof config.appName === "string" && config.appName.trim().length > 0) {
    env.appName = config.appName;
  }

  if (typeof config.cognitoClientId === "string") {
    env.cognitoClientId = config.cognitoClientId;
  }

  if (typeof config.cognitoDomain === "string") {
    env.cognitoDomain = config.cognitoDomain;
  }

  if (typeof config.cognitoRedirectUri === "string" && config.cognitoRedirectUri.trim().length > 0) {
    env.cognitoRedirectUri = config.cognitoRedirectUri;
  }
};

export const loadRuntimeConfig = async (configUrl = "/config.json"): Promise<void> => {
  try {
    const response = await fetch(configUrl, { cache: "no-store" });
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

