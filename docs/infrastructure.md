# Infrastructure

The CDK app lives in `infra/cdk`.

Current foundation:

- DynamoDB single table with `PK`/`SK` and `GSI1`
- Cognito User Pool and public customer web app client
- Optional Cognito hosted domain via `COGNITO_DOMAIN_PREFIX`
- Lambda for `services/api`
- HTTP API routes for the customer MVP
- Customer web hosting with S3 and CloudFront
- Optional custom domains for web and API

## Synth

```sh
pnpm install
pnpm build
pnpm infra:synth
```

`infra:synth` builds `services/api` before running `cdk synth` because the Lambda asset uses `services/api/dist`.

## Environment

```sh
APP_ENV=dev
CDK_DEFAULT_REGION=ap-south-1
ALLOWED_ORIGIN=http://localhost:5173
COGNITO_DOMAIN_PREFIX=
ROOT_DOMAIN_NAME=mycaffe.in
WEB_DOMAIN_NAME=dev.mycaffe.in
API_DOMAIN_NAME=api.dev.mycaffe.in
HOSTED_ZONE_ID=
HOSTED_ZONE_NAME=mycaffe.in
WEB_CERTIFICATE_ARN=
API_CERTIFICATE_ARN=
```

Production stacks retain the DynamoDB table. Non-production stacks use destroy removal policy to keep early development low-friction.

Google IdP secrets are not part of this slice. They should be wired later through Secrets Manager or secure CI/CD variables, never committed.

## Domain Plan

The purchased root domain is `mycaffe.in`.

Recommended dev hostnames:

- Customer web: `dev.mycaffe.in`
- Customer API: `api.dev.mycaffe.in`

Because the hosted zone is in the management account, there are two safe options:

1. Delegate `dev.mycaffe.in` to a hosted zone in the dev account. Then set `HOSTED_ZONE_ID` and `HOSTED_ZONE_NAME=dev.mycaffe.in` for CDK so it can create records.
2. Keep DNS in the management account. In that case, provide certificate ARNs to CDK and create the `dev.mycaffe.in` and `api.dev.mycaffe.in` DNS records from the management account using CDK outputs.

Certificate requirements:

- `WEB_CERTIFICATE_ARN` must be an ACM certificate in `us-east-1` for CloudFront.
- `API_CERTIFICATE_ARN` must be an ACM certificate in the API stack region, currently `ap-south-1`.

If certificate ARNs are not provided, CDK still creates the CloudFront distribution and API endpoint, but it does not attach custom domains.
