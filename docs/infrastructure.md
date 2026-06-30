# Infrastructure

The CDK app lives in `infra/cdk`.

Current foundation:

- DynamoDB single table with `PK`/`SK` and `GSI1`
- Cognito User Pool and public customer web app client
- Optional Cognito hosted domain via `COGNITO_DOMAIN_PREFIX`
- Lambda for `services/api`
- HTTP API routes for the customer MVP
- Cognito JWT authorizer on protected customer API routes
- Customer web hosting with S3 and CloudFront
- Customer web runtime config published as `/config.json`
- Optional custom domains for web and API

## Synth

```sh
pnpm install
pnpm build
pnpm infra:synth
```

`infra:synth` builds `services/api` before running `cdk synth` because the Lambda asset uses `services/api/dist`.

CDK also deploys a runtime config file for the customer web app at `/config.json`. This lets the static Vite build read the deployed API URL and Cognito client ID at runtime instead of requiring those values during `pnpm build`.

For the full dev deployment sequence, see [deployment-dev.md](deployment-dev.md).

## Environment

```sh
APP_ENV=dev
CDK_DEFAULT_REGION=ap-south-1
ALLOWED_ORIGIN=http://localhost:5173
COGNITO_DOMAIN_PREFIX=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET_NAME=
ROOT_DOMAIN_NAME=mycaffe.in
WEB_DOMAIN_NAME=dev.mycaffe.in
API_DOMAIN_NAME=api.dev.mycaffe.in
HOSTED_ZONE_ID=
HOSTED_ZONE_NAME=mycaffe.in
WEB_CERTIFICATE_ARN=
API_CERTIFICATE_ARN=
```

Production stacks retain the DynamoDB table. Non-production stacks use destroy removal policy to keep early development low-friction.

Google IdP client secret wiring uses Secrets Manager through `GOOGLE_CLIENT_SECRET_NAME`; the secret value itself is never committed.

## Domain Plan

The purchased root domain is `mycaffe.in`.

Recommended dev hostnames:

- Customer web: `dev.mycaffe.in`
- Customer API: `api.dev.mycaffe.in`

Because the hosted zone is in the management account, there are two safe options:

1. Delegate `dev.mycaffe.in` to a hosted zone in the dev account. Then set `HOSTED_ZONE_ID` and `HOSTED_ZONE_NAME=dev.mycaffe.in` for CDK so it can create records.
2. Keep DNS in the management account. In that case, provide certificate ARNs to CDK and create the `dev.mycaffe.in` and `api.dev.mycaffe.in` DNS records from the management account using CDK outputs. Use `CustomerWebDistributionDomainName` for the web record and `CustomerApiRegionalDomainName` plus `CustomerApiRegionalHostedZoneId` for the API record.

Certificate requirements:

- `WEB_CERTIFICATE_ARN` must be an ACM certificate in `us-east-1` for CloudFront.
- `API_CERTIFICATE_ARN` must be an ACM certificate in the API stack region, currently `ap-south-1`.

If certificate ARNs are not provided, CDK still creates the CloudFront distribution and API endpoint, but it does not attach custom domains.

## Customer Web Runtime Config

The website deployment uploads the built files from `apps/customer-web/dist` plus a generated `config.json`:

```json
{
  "apiBaseUrl": "https://api.dev.mycaffe.in/v1",
  "appName": "My Caffe",
  "cognitoClientId": "<Cognito app client id>",
  "cognitoDomain": "https://my-caffe-dev.auth.ap-south-1.amazoncognito.com",
  "cognitoRedirectUri": "https://dev.mycaffe.in/auth/callback",
  "useMockApi": false
}
```

If `API_CERTIFICATE_ARN` is absent, `apiBaseUrl` falls back to the generated API Gateway endpoint plus `/v1`.
