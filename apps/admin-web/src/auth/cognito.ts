interface CognitoHostedUiConfig {
  clientId: string;
  domain: string;
  redirectUri: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token?: string;
  token_type: string;
}

interface StoredTokens {
  accessToken: string;
  expiresAt: number;
  idToken: string;
  refreshToken?: string;
}

const storageKeys = {
  pkceVerifier: "my-caffe.admin.auth.pkce-verifier",
  returnPath: "my-caffe.admin.auth.return-path",
  state: "my-caffe.admin.auth.state",
  tokens: "my-caffe.admin.auth.tokens",
};

const normalizeDomain = (domain: string): string => domain.replace(/\/+$/, "");

const requireHostedUiConfig = (config: CognitoHostedUiConfig): void => {
  if (!config.domain || !config.clientId || !config.redirectUri) {
    throw new Error("Cognito Hosted UI is not configured.");
  }
};

const normalizeReturnPath = (returnPath: string | undefined): string => {
  if (
    !returnPath ||
    !returnPath.startsWith("/") ||
    returnPath.startsWith("//") ||
    returnPath.startsWith("/auth/callback") ||
    returnPath.startsWith("/admin/auth/callback")
  ) {
    return "/admin/cafes";
  }

  return returnPath;
};

const base64UrlEncode = (input: ArrayBuffer | Uint8Array): string => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let value = "";

  for (const byte of bytes) {
    value += String.fromCharCode(byte);
  }

  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const makeRandomString = (byteLength: number): string => {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
};

const createCodeChallenge = async (verifier: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(digest);
};

export const getAccessToken = (): string | null => {
  const rawTokens = window.sessionStorage.getItem(storageKeys.tokens);
  if (!rawTokens) {
    return null;
  }

  const tokens = JSON.parse(rawTokens) as StoredTokens;
  if (tokens.expiresAt <= Date.now()) {
    window.sessionStorage.removeItem(storageKeys.tokens);
    return null;
  }

  return tokens.accessToken;
};

export const startGoogleLogin = async (config: CognitoHostedUiConfig, returnPath = window.location.pathname): Promise<void> => {
  requireHostedUiConfig(config);

  const verifier = makeRandomString(48);
  const state = makeRandomString(24);
  const codeChallenge = await createCodeChallenge(verifier);
  const params = new URLSearchParams({
    client_id: config.clientId,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    identity_provider: "Google",
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
  });

  window.sessionStorage.setItem(storageKeys.pkceVerifier, verifier);
  window.sessionStorage.setItem(storageKeys.returnPath, normalizeReturnPath(returnPath));
  window.sessionStorage.setItem(storageKeys.state, state);
  window.location.assign(`${normalizeDomain(config.domain)}/oauth2/authorize?${params.toString()}`);
};

export const completeHostedUiCallback = async (
  config: CognitoHostedUiConfig,
  callbackUrl = window.location.href,
): Promise<string> => {
  requireHostedUiConfig(config);

  const url = new URL(callbackUrl);
  const error = url.searchParams.get("error");
  if (error) {
    throw new Error(url.searchParams.get("error_description") ?? error);
  }

  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const expectedState = window.sessionStorage.getItem(storageKeys.state);
  const verifier = window.sessionStorage.getItem(storageKeys.pkceVerifier);

  if (!code) {
    throw new Error("Missing Cognito authorization code.");
  }

  if (!returnedState || returnedState !== expectedState) {
    throw new Error("Invalid Cognito login state.");
  }

  if (!verifier) {
    throw new Error("Missing Cognito PKCE verifier.");
  }

  const response = await fetch(`${normalizeDomain(config.domain)}/oauth2/token`, {
    body: new URLSearchParams({
      client_id: config.clientId,
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to complete Cognito login.");
  }

  const tokenResponse = (await response.json()) as TokenResponse;
  const storedTokens: StoredTokens = {
    accessToken: tokenResponse.access_token,
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    idToken: tokenResponse.id_token,
    refreshToken: tokenResponse.refresh_token,
  };
  const returnPath = normalizeReturnPath(window.sessionStorage.getItem(storageKeys.returnPath) ?? undefined);

  window.sessionStorage.setItem(storageKeys.tokens, JSON.stringify(storedTokens));
  window.sessionStorage.removeItem(storageKeys.pkceVerifier);
  window.sessionStorage.removeItem(storageKeys.returnPath);
  window.sessionStorage.removeItem(storageKeys.state);

  return returnPath;
};

export const clearAuthSession = (): void => {
  window.sessionStorage.removeItem(storageKeys.pkceVerifier);
  window.sessionStorage.removeItem(storageKeys.returnPath);
  window.sessionStorage.removeItem(storageKeys.state);
  window.sessionStorage.removeItem(storageKeys.tokens);
};
