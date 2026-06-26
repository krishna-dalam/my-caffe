# My Caffe

Coffee subscription MVP.

## Customer MVP Flow

Cafe displays QR -> customer scans QR -> customer logs in with Google -> customer redeems coffee -> a 4-digit verification code appears -> staff visually verifies the code -> coffee count reduces.

## Workspaces

- `apps/customer-web`: customer-facing React + TypeScript + Vite app
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

## Current Implementation Slice

The customer web app is wired to a typed mock API so the end-to-end customer flow is usable before Cognito, API Gateway, Lambda, and DynamoDB are added. The mock boundary is isolated in `apps/customer-web/src/api/mockCoffeeApi.ts`.

No Razorpay, mobile app, cafe staff login, or production backend is included yet.
