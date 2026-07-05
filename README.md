# My Caffe

Coffee subscription MVP.

## Customer MVP Flow

Cafe displays QR -> customer scans QR -> customer logs in with Google -> customer redeems coffee -> a 4-digit verification code appears -> staff visually verifies the code -> coffee count reduces.

## Workspaces

- `apps/customer-web`: customer-facing React + TypeScript + Vite app
- `services/api`: Node.js + TypeScript API with Lambda-compatible handler
- `packages/shared`: shared domain and API contracts

Planned next:

- `apps/admin-web`
- `services/api`
- `infra/cdk`

## Local Development

This repository uses pnpm workspaces.

```sh
corepack enable
pnpm install
pnpm dev:customer
```

Then open the printed Vite URL and visit `/c/blue-bottle-demo`.

To display a cafe QR for customers to scan, visit `/qr/blue-bottle-demo`.

To run the local API skeleton:

```sh
pnpm dev:api
curl http://localhost:3000/v1/health
```

To point the customer app at the local API instead of the mock API, create `apps/customer-web/.env.local`:

```sh
VITE_USE_MOCK_API=false
VITE_API_BASE_URL="http://localhost:3000/v1"
VITE_DEV_ACCESS_TOKEN="demo-token"
```

Then run `pnpm dev:api` and `pnpm dev:customer` in separate terminals.

## Dev Cafe Seed

Use the dev seed script to create a sample cafe in DynamoDB and print its QR/redeem links:

```sh
TABLE_NAME="value-from-CoffeeTableName-output" \
WEB_BASE_URL="https://dev.mycaffe.in" \
API_BASE_URL="https://api.dev.mycaffe.in/v1" \
pnpm seed:dev-cafe
```

Example output:

```txt
Cafe created:
Name: Roast House Coffee
Status: active
QR poster: https://dev.mycaffe.in/qr/roast-house-coffee-gachibowli
Customer redeem: https://dev.mycaffe.in/c/roast-house-coffee-gachibowli
```

To also activate a membership for a customer, the customer must sign in once first so their Cognito-backed customer profile exists. Then run:

```sh
TABLE_NAME="value-from-CoffeeTableName-output" \
WEB_BASE_URL="https://dev.mycaffe.in" \
API_BASE_URL="https://api.dev.mycaffe.in/v1" \
CUSTOMER_EMAIL="customer@example.com" \
pnpm seed:dev-cafe
```

The current MVP stores plan details on the membership record, so the seed script does not create a separate plan item unless the data model adds one later. You can also use existing DynamoDB config with `COFFEE_TABLE_NAME` instead of `TABLE_NAME`.

## Dev Deployment

Use [docs/deployment-dev.md](docs/deployment-dev.md) for the `dev.mycaffe.in` deployment runbook.
Use [docs/dev-launch-checklist.md](docs/dev-launch-checklist.md) to track the external launch prerequisites and smoke tests.
Deployment is manual-only through local CDK commands or the `Deploy Dev` GitHub Actions workflow.

## CI

GitHub Actions runs build, typecheck, lint, test, and CDK synth on pushes to `main` and pull requests.

## Current Implementation Slice

The customer web app defaults to a typed mock API so the end-to-end customer flow is usable before AWS infrastructure exists. The backend API skeleton exposes matching customer routes with in-memory demo data and a Lambda-compatible handler.

No Razorpay, mobile app, cafe staff login, or production backend is included yet.
