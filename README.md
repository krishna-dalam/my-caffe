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

## Dev Deployment

Use [docs/deployment-dev.md](docs/deployment-dev.md) for the `dev.mycaffe.in` deployment runbook.
Deployment is manual-only through local CDK commands or the `Deploy Dev` GitHub Actions workflow.

## CI

GitHub Actions runs build, typecheck, lint, test, and CDK synth on pushes to `main` and pull requests.

## Current Implementation Slice

The customer web app defaults to a typed mock API so the end-to-end customer flow is usable before AWS infrastructure exists. The backend API skeleton exposes matching customer routes with in-memory demo data and a Lambda-compatible handler.

No Razorpay, mobile app, cafe staff login, or production backend is included yet.
