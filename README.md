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

## Current Implementation Slice

The customer web app defaults to a typed mock API so the end-to-end customer flow is usable before AWS infrastructure exists. The backend API skeleton exposes matching customer routes with in-memory demo data and a Lambda-compatible handler.

No Razorpay, mobile app, cafe staff login, or production backend is included yet.
