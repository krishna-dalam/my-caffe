# Dev Deployment Runbook

This runbook deploys the customer MVP to:

- Customer web: `https://dev.mycaffe.in`
- Customer API: `https://api.dev.mycaffe.in`

## Prerequisites

- Valid AWS credentials for the dev account.
- CDK bootstrap already completed in the dev account and `ap-south-1`.
- Google OAuth client created.
- Google OAuth client secret stored in AWS Secrets Manager.
- ACM certificate for `dev.mycaffe.in` in `us-east-1` for CloudFront.
- ACM certificate for `api.dev.mycaffe.in` in `ap-south-1` for API Gateway.
- DNS access for `mycaffe.in` in the management account, or a delegated hosted zone for dev records.

Validate credentials:

```sh
aws sts get-caller-identity
```

## Environment

Create `infra/cdk/.env.local` or export these values in your shell:

```sh
export CDK_DEFAULT_ACCOUNT="dev-account-id"
export CDK_DEFAULT_REGION="ap-south-1"
export APP_ENV="dev"

export ROOT_DOMAIN_NAME="mycaffe.in"
export WEB_DOMAIN_NAME="dev.mycaffe.in"
export API_DOMAIN_NAME="api.dev.mycaffe.in"
export ALLOWED_ORIGIN="https://dev.mycaffe.in"

export COGNITO_DOMAIN_PREFIX="my-caffe-dev"
export GOOGLE_CLIENT_ID="google-oauth-client-id"
export GOOGLE_CLIENT_SECRET_NAME="/my-caffe/dev/google-client-secret"

export WEB_CERTIFICATE_ARN="arn:aws:acm:us-east-1:dev-account-id:certificate/..."
export API_CERTIFICATE_ARN="arn:aws:acm:ap-south-1:dev-account-id:certificate/..."
```

If using a delegated hosted zone in the dev account, also set:

```sh
export HOSTED_ZONE_ID="Z..."
export HOSTED_ZONE_NAME="dev.mycaffe.in"
```

If DNS stays in the management account, leave `HOSTED_ZONE_ID` empty and create the DNS records manually from CDK outputs.
Leave `HOSTED_ZONE_NAME` empty as well unless `HOSTED_ZONE_ID` is set.

## Google OAuth Callback

Add this authorized redirect URI in Google Cloud Console:

```txt
https://my-caffe-dev.auth.ap-south-1.amazoncognito.com/oauth2/idpresponse
```

The customer web callback is configured in Cognito by CDK:

```txt
https://dev.mycaffe.in/auth/callback
```

## Deploy

Run local checks first:

```sh
pnpm install
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

Validate deployment configuration before waiting on CDK:

```sh
pnpm infra:preflight:dev
```

Review infrastructure changes:

```sh
pnpm infra:diff
```

Deploy:

```sh
pnpm infra:deploy
```

CDK deploys `apps/customer-web/dist` and a generated `/config.json` file. The runtime config points the web app at the deployed API and Cognito client.

## GitHub Actions Deploy

The `Deploy Dev` workflow is manual-only and uses GitHub OIDC to assume an AWS role. Configure a protected GitHub environment named `dev`.

Environment secret:

```txt
DEV_AWS_DEPLOY_ROLE_ARN
```

Environment variables:

```txt
DEV_API_CERTIFICATE_ARN
DEV_AWS_ACCOUNT_ID
DEV_GOOGLE_CLIENT_ID
DEV_GOOGLE_CLIENT_SECRET_NAME
DEV_HOSTED_ZONE_ID
DEV_HOSTED_ZONE_NAME
DEV_WEB_CERTIFICATE_ARN
```

If DNS remains in the management account, leave `DEV_HOSTED_ZONE_ID` and `DEV_HOSTED_ZONE_NAME` empty and create DNS records manually after deploy.

The assumed AWS role should trust this repository's GitHub OIDC provider and be scoped to the `dev` environment where possible. The workflow runs build, typecheck, lint, tests, then `pnpm infra:deploy:ci`.

## DNS

When `HOSTED_ZONE_ID` is configured, CDK creates Route 53 alias records.

When DNS remains in the management account, create these records manually:

- `dev.mycaffe.in` -> CloudFront distribution domain from `CustomerWebDistributionDomainName`
- `api.dev.mycaffe.in` -> API Gateway regional domain target shown in the API Gateway custom domain console

## Manual Customer Activation

After a customer signs in once, find their Cognito `sub` and activate the dev subscription:

```sh
COFFEE_TABLE_NAME="value-from-CoffeeTableName-output" \
AWS_REGION="ap-south-1" \
pnpm activate:customer \
  --customer-id "cognito-sub" \
  --customer-email "customer@example.com" \
  --customer-name "Customer Name"
```

The script is safe to run after first login: existing cafe and customer profile records are skipped by default. Existing membership records are not overwritten unless you pass `--overwrite`.

## Smoke Test

1. Open `https://dev.mycaffe.in/qr/blue-bottle-demo`.
2. Scan the QR code and confirm it opens `https://dev.mycaffe.in/c/blue-bottle-demo`.
3. Continue with Google.
4. Redeem one coffee.
5. Confirm a 4-digit verification code appears.
6. Confirm remaining coffee count decreases by one.
7. Refresh and confirm redemption history remains visible.

## Current Limitation

This runbook still uses manual subscription activation. Razorpay and admin activation UI are intentionally out of scope for the MVP deployment path.
