interface RuntimeConfig {
  apiBaseUrl?: unknown;
  appName?: unknown;
  cognitoClientId?: unknown;
  cognitoDomain?: unknown;
  cognitoRedirectUri?: unknown;
  useMockApi?: unknown;
}

interface ApiSuccess<T> {
  data: T;
  requestId: string;
}

interface CafeLandingView {
  activeMembership: unknown;
  cafe?: {
    slug?: unknown;
  };
}

interface SmokeConfig {
  apiBaseUrl: string;
  cafeSlug: string;
  dryRun: boolean;
  webBaseUrl: string;
}

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const readEnv = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
};

const readArgs = (): SmokeConfig => {
  const dryRun = process.argv.includes("--dry-run");
  const webBaseUrl = trimTrailingSlash(readEnv("SMOKE_WEB_BASE_URL") ?? "https://dev.mycaffe.in");
  const apiBaseUrl = trimTrailingSlash(readEnv("SMOKE_API_BASE_URL") ?? "https://api.dev.mycaffe.in/v1");
  const cafeSlug = readEnv("SMOKE_CAFE_SLUG") ?? "blue-bottle-demo";

  return {
    apiBaseUrl,
    cafeSlug,
    dryRun,
    webBaseUrl,
  };
};

const assertHttpsUrl = (name: string, value: string): void => {
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error(`${name} must use https.`);
  }
};

const isSuccessEnvelope = <T>(payload: unknown): payload is ApiSuccess<T> =>
  Boolean(payload && typeof payload === "object" && "data" in payload && "requestId" in payload);

const getJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}.`);
  }

  return response.json() as Promise<T>;
};

const validateRuntimeConfig = (config: RuntimeConfig, expected: SmokeConfig): void => {
  if (config.useMockApi !== false) {
    throw new Error("Runtime config must set useMockApi=false.");
  }

  if (config.apiBaseUrl !== expected.apiBaseUrl) {
    throw new Error(`Runtime config apiBaseUrl must be ${expected.apiBaseUrl}.`);
  }

  if (typeof config.cognitoClientId !== "string" || config.cognitoClientId.trim().length === 0) {
    throw new Error("Runtime config must include cognitoClientId.");
  }

  if (typeof config.cognitoDomain !== "string" || !config.cognitoDomain.startsWith("https://")) {
    throw new Error("Runtime config must include an https Cognito domain.");
  }

  if (config.cognitoRedirectUri !== `${expected.webBaseUrl}/auth/callback`) {
    throw new Error(`Runtime config cognitoRedirectUri must be ${expected.webBaseUrl}/auth/callback.`);
  }
};

const validateHealth = (payload: unknown): void => {
  if (!isSuccessEnvelope<{ status?: unknown }>(payload) || payload.data.status !== "ok") {
    throw new Error("Health endpoint did not return the expected success envelope.");
  }
};

const validateCafeLanding = (payload: unknown, cafeSlug: string): void => {
  if (!isSuccessEnvelope<CafeLandingView>(payload)) {
    throw new Error("Cafe endpoint did not return a success envelope.");
  }

  if (payload.data.cafe?.slug !== cafeSlug) {
    throw new Error(`Cafe endpoint did not return slug ${cafeSlug}.`);
  }

  if (payload.data.activeMembership !== null) {
    throw new Error("Unauthenticated cafe landing should not include an active membership.");
  }
};

const main = async (): Promise<void> => {
  const config = readArgs();
  assertHttpsUrl("SMOKE_WEB_BASE_URL", config.webBaseUrl);
  assertHttpsUrl("SMOKE_API_BASE_URL", config.apiBaseUrl);

  console.log("Dev smoke configuration:");
  console.log(`- Web: ${config.webBaseUrl}`);
  console.log(`- API: ${config.apiBaseUrl}`);
  console.log(`- Cafe slug: ${config.cafeSlug}`);

  if (config.dryRun) {
    console.log("Dry run passed.");
    return;
  }

  validateRuntimeConfig(await getJson<RuntimeConfig>(`${config.webBaseUrl}/config.json`), config);
  console.log("- Runtime config is valid.");

  validateHealth(await getJson<unknown>(`${config.apiBaseUrl}/health`));
  console.log("- API health is valid.");

  validateCafeLanding(await getJson<unknown>(`${config.apiBaseUrl}/cafes/${encodeURIComponent(config.cafeSlug)}`), config.cafeSlug);
  console.log("- Cafe landing API is valid.");

  console.log("Dev smoke check passed.");
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Dev smoke check failed.");
  process.exit(1);
});
