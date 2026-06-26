# Infrastructure

The CDK app lives in `infra/cdk`.

Current foundation:

- DynamoDB single table with `PK`/`SK` and `GSI1`
- Cognito User Pool and public customer web app client
- Optional Cognito hosted domain via `COGNITO_DOMAIN_PREFIX`
- Lambda for `services/api`
- HTTP API routes for the customer MVP

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
```

Production stacks retain the DynamoDB table. Non-production stacks use destroy removal policy to keep early development low-friction.

Google IdP secrets are not part of this slice. They should be wired later through Secrets Manager or secure CI/CD variables, never committed.
