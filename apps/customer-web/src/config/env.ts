interface CustomerWebEnv {
  appName: string;
  apiBaseUrl: string;
  useMockApi: boolean;
  cognitoDomain: string;
  cognitoClientId: string;
  cognitoRedirectUri: string;
  devAccessToken: string;
}

const readEnv = (key: string): string | undefined => {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
};

export const env: CustomerWebEnv = {
  appName: readEnv("VITE_APP_NAME") ?? "My Caffe",
  apiBaseUrl: readEnv("VITE_API_BASE_URL") ?? "http://localhost:3000/v1",
  useMockApi: readEnv("VITE_USE_MOCK_API") !== "false",
  cognitoDomain: readEnv("VITE_COGNITO_DOMAIN") ?? "",
  cognitoClientId: readEnv("VITE_COGNITO_CLIENT_ID") ?? "",
  cognitoRedirectUri: readEnv("VITE_COGNITO_REDIRECT_URI") ?? window.location.origin + "/auth/callback",
  devAccessToken: readEnv("VITE_DEV_ACCESS_TOKEN") ?? "",
};
