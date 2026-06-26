# Customer Web MVP PR Plan

## PR 1: Customer Web Vertical Slice

Status: implemented in this working tree.

Goal: create a runnable customer-facing web app that demonstrates the QR-to-redemption experience with a typed mock API boundary.

Files:

- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `.gitignore`
- `.env.example`
- `README.md`
- `packages/shared/**`
- `apps/customer-web/**`

Acceptance:

- Customer can open a cafe QR route, for example `/c/blue-bottle-demo`.
- Customer can use a Google-login-style action.
- Customer can view active membership and remaining coffee count.
- Customer can redeem one coffee.
- App displays a 4-digit verification code.
- Remaining coffee count reduces immediately after redemption.
- Empty and error states are visible.

Tradeoff:

- Authentication and persistence are mocked for this PR. The mock is behind the API client so a real Cognito/API Gateway backend can replace it in the next slices.

## PR 2: Customer Web Flow Hardening

Status: implemented in this working tree.

Goal: make the customer app easier to verify repeatedly and closer to the real hosted-auth flow while staying backend-free.

Files:

- `apps/customer-web/src/App.tsx`
- `apps/customer-web/src/api/coffeeApi.ts`
- `apps/customer-web/src/api/mockCoffeeApi.ts`
- `apps/customer-web/src/pages/AuthCallbackPage.tsx`
- `apps/customer-web/src/pages/CafePage.tsx`
- `apps/customer-web/src/styles/app.css`
- `packages/shared/src/index.ts`

Acceptance:

- `/auth/callback` is handled as a first-class route.
- Customer can sign out of the mock session.
- Customer can reset demo data for repeatable local testing.
- Redemption history is visible after coffee redemption and after page refresh.
- Coffee count still decreases by one per redemption.

## PR 3: Backend API Skeleton

Goal: add `services/api` with Lambda-compatible routing, health check, typed config, consistent API responses, and tests.

Files to create:

- `services/api/package.json`
- `services/api/tsconfig.json`
- `services/api/src/handler.ts`
- `services/api/src/config/env.ts`
- `services/api/src/http/router.ts`
- `services/api/src/http/responses.ts`
- `services/api/src/modules/health/health.handler.ts`
- `services/api/src/modules/health/health.test.ts`

## PR 4: Cognito Hosted UI Integration

Goal: replace mock login with AWS Cognito Google Hosted UI.

Files to update/create:

- `apps/customer-web/.env.example`
- `apps/customer-web/src/auth/cognito.ts`
- `apps/customer-web/src/auth/AuthProvider.tsx`
- `apps/customer-web/src/pages/AuthCallbackPage.tsx`
- `docs/auth.md`

## PR 5: Subscription and Redemption API

Goal: add customer profile, membership lookup, and redemption APIs with testable service logic.

Files to create:

- `services/api/src/modules/customers/**`
- `services/api/src/modules/memberships/**`
- `services/api/src/modules/redemptions/**`
- `services/api/src/repositories/**`

## PR 6: AWS CDK Foundation

Goal: add deployable AWS infrastructure for Cognito, API Gateway, Lambda, and DynamoDB.

Files to create:

- `infra/cdk/package.json`
- `infra/cdk/bin/app.ts`
- `infra/cdk/lib/coffee-subscription-stack.ts`
- `infra/cdk/lib/constructs/auth.construct.ts`
- `infra/cdk/lib/constructs/api.construct.ts`
- `infra/cdk/lib/constructs/database.construct.ts`

## PR 7: Admin Manual Activation

Goal: add admin web and APIs for cafe setup, plan setup, and manual membership activation.

Files to create:

- `apps/admin-web/**`
- `services/api/src/modules/admin/**`
- `services/api/src/modules/cafes/**`
- `services/api/src/modules/plans/**`
