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

interface TokenStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

const storageKeys = {
  pkceVerifier: "my-caffe.auth.pkce-verifier",
  returnPath: "my-caffe.auth.return-path",
  state: "my-caffe.auth.state",
  tokens: "my-caffe.auth.tokens",
};

const getStorage = (): TokenStorage => window.sessionStorage;

const normalizeDomain = (domain: string): string => domain.replace(/\/+$/, "");

const requireHostedUiConfig = (config: CognitoHostedUiConfig): void => {
  if (!config.domain || !config.clientId || !config.redirectUri) {
    throw new Error("Cognito Hosted UI is not configured.");
  }
};

export const normalizeAuthReturnPath = (returnPath: string | undefined): string => {
  if (!returnPath || !returnPath.startsWith("/") || returnPath.startsWith("//")) {
    return "/c/blue-bottle-demo";
  }

  if (returnPath.startsWith("/auth/callback")) {
    return "/c/blue-bottle-demo";
  }

  return returnPath;
};

const makeRandomString = (byteLength: number): string => {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
};

export const base64UrlEncode = (input: ArrayBuffer | Uint8Array): string => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let value = "";

  for (const byte of bytes) {
    value += String.fromCharCode(byte);
  }

  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const createCodeChallenge = async (verifier: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(digest);
};

export const buildGoogleAuthorizeUrl = ({
  clientId,
  codeChallenge,
  domain,
  redirectUri,
  state,
}: CognitoHostedUiConfig & { codeChallenge: string; state: string }): string => {
  requireHostedUiConfig({ clientId, domain, redirectUri });

  const params = new URLSearchParams({
    client_id: clientId,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    identity_provider: "Google",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
  });

  return `${normalizeDomain(domain)}/oauth2/authorize?${params.toString()}`;
};

export const startGoogleLogin = async (config: CognitoHostedUiConfig, returnPath = window.location.pathname): Promise<void> => {
  requireHostedUiConfig(config);

  const verifier = makeRandomString(48);
  const state = makeRandomString(24);
  const codeChallenge = await createCodeChallenge(verifier);
  const storage = getStorage();

  storage.setItem(storageKeys.pkceVerifier, verifier);
  storage.setItem(storageKeys.returnPath, normalizeAuthReturnPath(returnPath));
  storage.setItem(storageKeys.state, state);
  window.location.assign(buildGoogleAuthorizeUrl({ ...config, codeChallenge, state }));
};

export const completeHostedUiCallback = async (
  config: CognitoHostedUiConfig,
  callbackUrl = window.location.href,
): Promise<void> => {
  requireHostedUiConfig(config);

  const url = new URL(callbackUrl);
  const error = url.searchParams.get("error");
  if (error) {
    throw new Error(url.searchParams.get("error_description") ?? error);
  }

  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const storage = getStorage();
  const expectedState = storage.getItem(storageKeys.state);
  const verifier = storage.getItem(storageKeys.pkceVerifier);

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

  storage.setItem(storageKeys.tokens, JSON.stringify(storedTokens));
  storage.removeItem(storageKeys.pkceVerifier);
  storage.removeItem(storageKeys.state);
};

export const consumeAuthReturnPath = (): string => {
  const storage = getStorage();
  const returnPath = normalizeAuthReturnPath(storage.getItem(storageKeys.returnPath) ?? undefined);
  storage.removeItem(storageKeys.returnPath);
  return returnPath;
};

export const getAccessToken = (): string | null => {
  const rawTokens = getStorage().getItem(storageKeys.tokens);
  if (!rawTokens) {
    return null;
  }

  const tokens = JSON.parse(rawTokens) as StoredTokens;
  if (tokens.expiresAt <= Date.now()) {
    getStorage().removeItem(storageKeys.tokens);
    return null;
  }

  return tokens.accessToken;
};

export const clearAuthSession = (): void => {
  const storage = getStorage();
  storage.removeItem(storageKeys.pkceVerifier);
  storage.removeItem(storageKeys.returnPath);
  storage.removeItem(storageKeys.state);
  storage.removeItem(storageKeys.tokens);
};

export const logoutFromHostedUi = (config: CognitoHostedUiConfig, logoutUri = window.location.origin): void => {
  clearAuthSession();

  if (!config.domain || !config.clientId) {
    return;
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    logout_uri: logoutUri,
  });

  window.location.assign(`${normalizeDomain(config.domain)}/logout?${params.toString()}`);
};
