import { execFileSync } from "node:child_process";

const requiredEnvVars = [
  "ALLOWED_ORIGIN",
  "ADMIN_EMAILS",
  "API_CERTIFICATE_ARN",
  "API_DOMAIN_NAME",
  "APP_ENV",
  "CDK_DEFAULT_ACCOUNT",
  "CDK_DEFAULT_REGION",
  "COGNITO_DOMAIN_PREFIX",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET_NAME",
  "ROOT_DOMAIN_NAME",
  "WEB_CERTIFICATE_ARN",
  "WEB_DOMAIN_NAME",
] as const;

const readEnv = (name: string): string => process.env[name]?.trim() ?? "";

const isValidHttpsUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.pathname === "/" && url.search === "" && url.hash === "";
  } catch {
    return false;
  }
};

const certificateRegionFromArn = (arn: string): string | undefined => {
  const arnParts = arn.split(":");
  if (arnParts.length < 6 || arnParts[0] !== "arn" || arnParts[2] !== "acm") {
    return undefined;
  }

  return arnParts[3];
};

const validateCognitoDomainPrefix = (prefix: string): boolean =>
  /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(prefix);

const shouldSkipAwsIdentityCheck = (): boolean => readEnv("SKIP_AWS_IDENTITY_CHECK") === "true";

const readAwsIdentityAccount = (): string => {
  try {
    const output = execFileSync("aws", ["sts", "get-caller-identity", "--output", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const identity = JSON.parse(output) as { Account?: unknown };
    if (typeof identity.Account === "string" && /^\d{12}$/.test(identity.Account)) {
      return identity.Account;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(`AWS credentials are not valid for deployment: ${message}`);
  }

  throw new Error("AWS credentials are not valid for deployment: unable to read AWS account from STS.");
};

const errors: string[] = [];

for (const envVar of requiredEnvVars) {
  if (!readEnv(envVar)) {
    errors.push(`${envVar} is required for dev deployment.`);
  }
}

const appEnv = readEnv("APP_ENV");
const account = readEnv("CDK_DEFAULT_ACCOUNT");
const region = readEnv("CDK_DEFAULT_REGION");
const allowedOrigin = readEnv("ALLOWED_ORIGIN");
const apiCertificateArn = readEnv("API_CERTIFICATE_ARN");
const apiDomainName = readEnv("API_DOMAIN_NAME");
const cognitoDomainPrefix = readEnv("COGNITO_DOMAIN_PREFIX");
const hostedZoneId = readEnv("HOSTED_ZONE_ID");
const hostedZoneName = readEnv("HOSTED_ZONE_NAME");
const rootDomainName = readEnv("ROOT_DOMAIN_NAME");
const webCertificateArn = readEnv("WEB_CERTIFICATE_ARN");
const webDomainName = readEnv("WEB_DOMAIN_NAME");

if (appEnv && appEnv !== "dev") {
  errors.push(`APP_ENV must be "dev" for this preflight, received "${appEnv}".`);
}

if (account && !/^\d{12}$/.test(account)) {
  errors.push("CDK_DEFAULT_ACCOUNT must be a 12-digit AWS account ID.");
}

if (region && region !== "ap-south-1") {
  errors.push(`CDK_DEFAULT_REGION must be "ap-south-1" for dev, received "${region}".`);
}

if (allowedOrigin && !isValidHttpsUrl(allowedOrigin)) {
  errors.push("ALLOWED_ORIGIN must be an https origin without path, query, or hash.");
}

if (allowedOrigin && webDomainName && allowedOrigin !== `https://${webDomainName}`) {
  errors.push("ALLOWED_ORIGIN must match WEB_DOMAIN_NAME, for example https://dev.mycaffe.in.");
}

if (apiDomainName && rootDomainName && !apiDomainName.endsWith(`.${rootDomainName}`)) {
  errors.push("API_DOMAIN_NAME must be a subdomain of ROOT_DOMAIN_NAME.");
}

if (webDomainName && rootDomainName && !webDomainName.endsWith(`.${rootDomainName}`)) {
  errors.push("WEB_DOMAIN_NAME must be a subdomain of ROOT_DOMAIN_NAME.");
}

if (cognitoDomainPrefix && !validateCognitoDomainPrefix(cognitoDomainPrefix)) {
  errors.push("COGNITO_DOMAIN_PREFIX must use lowercase letters, numbers, and hyphens, without leading or trailing hyphens.");
}

const apiCertificateRegion = apiCertificateArn ? certificateRegionFromArn(apiCertificateArn) : undefined;
if (apiCertificateArn && !apiCertificateRegion) {
  errors.push("API_CERTIFICATE_ARN must be a valid ACM certificate ARN.");
} else if (apiCertificateRegion && region && apiCertificateRegion !== region) {
  errors.push(`API_CERTIFICATE_ARN must be in ${region}, received ${apiCertificateRegion}.`);
}

const webCertificateRegion = webCertificateArn ? certificateRegionFromArn(webCertificateArn) : undefined;
if (webCertificateArn && !webCertificateRegion) {
  errors.push("WEB_CERTIFICATE_ARN must be a valid ACM certificate ARN.");
} else if (webCertificateRegion && webCertificateRegion !== "us-east-1") {
  errors.push(`WEB_CERTIFICATE_ARN must be in us-east-1 for CloudFront, received ${webCertificateRegion}.`);
}

if (Boolean(hostedZoneId) !== Boolean(hostedZoneName)) {
  errors.push("HOSTED_ZONE_ID and HOSTED_ZONE_NAME must either both be set for Route 53 records or both be empty for manual DNS.");
}

if (hostedZoneName && rootDomainName && hostedZoneName !== rootDomainName && !hostedZoneName.endsWith(`.${rootDomainName}`)) {
  errors.push("HOSTED_ZONE_NAME must be ROOT_DOMAIN_NAME or one of its subdomains.");
}

if (!shouldSkipAwsIdentityCheck()) {
  try {
    const awsAccount = readAwsIdentityAccount();
    if (account && awsAccount !== account) {
      errors.push(`AWS credentials resolve to account ${awsAccount}, but CDK_DEFAULT_ACCOUNT is ${account}.`);
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "AWS credentials are not valid for deployment.");
  }
}

if (errors.length > 0) {
  console.error("Dev deploy preflight failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Dev deploy preflight passed.");
console.log(`- Web domain: ${webDomainName}`);
console.log(`- API domain: ${apiDomainName}`);
console.log(`- AWS account: ${account}`);
console.log(`- AWS region: ${region}`);
console.log(`- AWS identity check: ${shouldSkipAwsIdentityCheck() ? "skipped" : "passed"}`);
console.log(`- DNS mode: ${hostedZoneId ? "Route 53 records managed by CDK" : "manual DNS records"}`);
