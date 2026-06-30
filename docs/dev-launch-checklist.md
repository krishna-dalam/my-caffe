# Dev Launch Checklist

Use this checklist to launch the customer MVP at `https://dev.mycaffe.in`.

## 1. AWS Account

- [ ] Confirm dev AWS account ID.
- [ ] Confirm `ap-south-1` is the deployment region.
- [ ] Confirm CDK bootstrap has run in `ap-south-1`.
- [ ] Confirm local or GitHub deploy identity can run `aws sts get-caller-identity`.

Required values:

```txt
DEV_AWS_ACCOUNT_ID=
CDK_DEFAULT_REGION=ap-south-1
```

## 2. Certificates

- [ ] Request or confirm ACM certificate for `dev.mycaffe.in` in `us-east-1`.
- [ ] Request or confirm ACM certificate for `api.dev.mycaffe.in` in `ap-south-1`.
- [ ] Complete DNS validation for both certificates in the management account DNS zone.

Required values:

```txt
DEV_WEB_CERTIFICATE_ARN=
DEV_API_CERTIFICATE_ARN=
```

## 3. Google OAuth

- [ ] Create Google OAuth web client.
- [ ] Add Cognito IdP callback URL:

```txt
https://my-caffe-dev.auth.ap-south-1.amazoncognito.com/oauth2/idpresponse
```

- [ ] Store the Google OAuth client secret in AWS Secrets Manager.
- [ ] Confirm the secret is in the dev account and `ap-south-1`.

Required values:

```txt
DEV_GOOGLE_CLIENT_ID=
DEV_GOOGLE_CLIENT_SECRET_NAME=/my-caffe/dev/google-client-secret
```

## 4. GitHub Deployment

- [ ] Configure protected GitHub environment named `dev`.
- [ ] Create or confirm AWS IAM OIDC provider for `https://token.actions.githubusercontent.com`.
- [ ] Generate deploy role policies:

```sh
DEV_AWS_ACCOUNT_ID="dev-account-id" \
CDK_DEFAULT_REGION="ap-south-1" \
GITHUB_ORG="krishna-dalam" \
GITHUB_REPO="my-caffe" \
GITHUB_ENVIRONMENT="dev" \
pnpm infra:print:github-oidc-policies
```

- [ ] Create `my-caffe-dev-github-deploy` role from generated policies.
- [ ] Add GitHub environment secret:

```txt
DEV_AWS_DEPLOY_ROLE_ARN=
```

- [ ] Add GitHub environment variables:

```txt
DEV_API_CERTIFICATE_ARN=
DEV_AWS_ACCOUNT_ID=
DEV_GOOGLE_CLIENT_ID=
DEV_GOOGLE_CLIENT_SECRET_NAME=
DEV_HOSTED_ZONE_ID=
DEV_HOSTED_ZONE_NAME=
DEV_WEB_CERTIFICATE_ARN=
```

If DNS stays in the management account, leave `DEV_HOSTED_ZONE_ID` and `DEV_HOSTED_ZONE_NAME` empty.

## 5. Preflight

- [ ] Run:

```sh
pnpm infra:preflight:dev
```

- [ ] Confirm preflight passes, including the AWS identity check.
- [ ] Confirm `pnpm infra:diff` shows expected dev resources only.

## 6. Deploy

- [ ] Run the `Deploy Dev` GitHub Actions workflow, or run `pnpm infra:deploy` locally with valid dev AWS credentials.
- [ ] Capture CDK outputs:

```txt
CoffeeTableName=
CustomerApiRegionalDomainName=
CustomerApiRegionalHostedZoneId=
CustomerWebDistributionDomainName=
CustomerUserPoolClientId=
CustomerUserPoolId=
```

## 7. DNS

If CDK did not manage Route 53 records, create records in the management account:

- [ ] `dev.mycaffe.in` -> `CustomerWebDistributionDomainName`
- [ ] `api.dev.mycaffe.in` -> `CustomerApiRegionalDomainName`

Alias hosted zone IDs:

```txt
CloudFront=Z2FDTNDATAQYW2
API Gateway=CustomerApiRegionalHostedZoneId
```

## 8. Public Smoke Check

- [ ] Wait for DNS to resolve.
- [ ] Run:

```sh
pnpm smoke:dev
```

- [ ] Confirm `/config.json` points to `https://api.dev.mycaffe.in/v1`.
- [ ] Confirm API health passes.
- [ ] Confirm unauthenticated cafe landing passes.

## 9. Customer Activation

- [ ] Open `https://dev.mycaffe.in/c/blue-bottle-demo`.
- [ ] Sign in once with Google.
- [ ] Find the customer profile:

```sh
COFFEE_TABLE_NAME="CoffeeTableName-output" \
AWS_REGION="ap-south-1" \
pnpm find:customer --email "customer@example.com"
```

- [ ] Activate the subscription:

```sh
COFFEE_TABLE_NAME="CoffeeTableName-output" \
AWS_REGION="ap-south-1" \
pnpm activate:customer \
  --customer-id "customer-id-from-find-customer" \
  --customer-email "customer@example.com" \
  --customer-name "Customer Name"
```

## 10. Authenticated QR Smoke Test

- [ ] Open `https://dev.mycaffe.in/qr/blue-bottle-demo`.
- [ ] Scan or open the rendered QR URL.
- [ ] Continue with Google.
- [ ] Confirm active subscription is visible.
- [ ] Redeem one coffee.
- [ ] Confirm a 4-digit verification code appears.
- [ ] Confirm remaining coffee count decreases by one.
- [ ] Refresh and confirm redemption history remains visible.
