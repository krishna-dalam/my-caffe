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

## PR 3: Customer Flow Regression Tests

Status: implemented in this working tree.

Goal: protect the core customer redemption behavior with automated tests before replacing the mock API with the real backend.

Files:

- `apps/customer-web/package.json`
- `apps/customer-web/src/api/mockCoffeeApi.ts`
- `apps/customer-web/src/api/mockCoffeeApi.test.ts`
- `pnpm-lock.yaml`

Acceptance:

- Tests prove login is required before membership is shown.
- Tests prove one redemption returns a 4-digit verification code and decreases count.
- Tests prove redemption history is recorded.
- Tests prove redemption is blocked when signed out.
- Tests prove redemption stops when coffee count reaches zero.
- Tests prove demo data can be reset.

## PR 4: Cognito Hosted UI Client Wiring

Status: implemented in this working tree.

Goal: add frontend Cognito Hosted UI support behind env config while preserving the mock local development path.

Files:

- `apps/customer-web/src/auth/cognito.ts`
- `apps/customer-web/src/auth/cognito.test.ts`
- `apps/customer-web/src/api/coffeeApi.ts`
- `apps/customer-web/src/api/mockCoffeeApi.ts`
- `apps/customer-web/src/pages/AuthCallbackPage.tsx`
- `docs/auth.md`

Acceptance:

- Real mode starts Cognito Hosted UI Google login with Authorization Code + PKCE.
- `/auth/callback` exchanges the authorization code instead of starting login again.
- API requests include a bearer token when a valid access token is present.
- Logout clears local token state and uses Cognito logout when configured.
- Mock mode remains the default local development path.

## PR 5: Backend API Skeleton

Status: implemented in this working tree.

Goal: add `services/api` with Lambda-compatible routing, health check, typed config, consistent API responses, and tests.

Files:

- `services/api/package.json`
- `services/api/tsconfig.json`
- `services/api/src/handler.ts`
- `services/api/src/config/env.ts`
- `services/api/src/http/router.ts`
- `services/api/src/http/responses.ts`
- `services/api/src/http/router.test.ts`
- `services/api/src/modules/customer/demoStore.ts`
- `services/api/src/localServer.ts`

Acceptance:

- `GET /v1/health` returns a consistent success envelope.
- `GET /v1/cafes/:slug` returns cafe landing data.
- Protected customer routes require a bearer token.
- `POST /v1/redemptions` decrements remaining coffee count and returns a 4-digit verification code.
- `GET /v1/me/redemptions` returns redemption history.
- API business flow is covered by tests.

## PR 6: Local Customer Web to API Integration

Status: implemented in this working tree.

Goal: let the customer web app use the local API skeleton in real API mode before Cognito infrastructure is available.

Files:

- `apps/customer-web/.env.example`
- `apps/customer-web/src/api/authToken.ts`
- `apps/customer-web/src/api/authToken.test.ts`
- `apps/customer-web/src/api/coffeeApi.ts`
- `apps/customer-web/src/config/env.ts`
- `README.md`
- `docs/auth.md`

Acceptance:

- Customer web can run with `VITE_USE_MOCK_API=false`.
- Local API requests include `Authorization: Bearer <VITE_DEV_ACCESS_TOKEN>` when provided.
- Hosted UI tokens still take precedence over local development tokens.
- Mock mode remains the default development path.
- Local API integration setup is documented.

## PR 7: Cognito Hosted UI Infrastructure Wiring

Goal: provision Cognito User Pool, Google IdP, and app client settings with AWS CDK.

Files to update/create:

- `apps/customer-web/.env.example`
- `apps/customer-web/src/auth/cognito.ts`
- `apps/customer-web/src/auth/AuthProvider.tsx`
- `apps/customer-web/src/pages/AuthCallbackPage.tsx`
- `docs/auth.md`

## PR 8: Subscription and Redemption API

Goal: add customer profile, membership lookup, and redemption APIs with testable service logic.

Files to create:

- `services/api/src/modules/customers/**`
- `services/api/src/modules/memberships/**`
- `services/api/src/modules/redemptions/**`
- `services/api/src/repositories/**`

## PR 9: AWS CDK Foundation

Goal: add deployable AWS infrastructure for Cognito, API Gateway, Lambda, and DynamoDB.

Files to create:

- `infra/cdk/package.json`
- `infra/cdk/bin/app.ts`
- `infra/cdk/lib/coffee-subscription-stack.ts`
- `infra/cdk/lib/constructs/auth.construct.ts`
- `infra/cdk/lib/constructs/api.construct.ts`
- `infra/cdk/lib/constructs/database.construct.ts`

## PR 10: Admin Manual Activation

Goal: add admin web and APIs for cafe setup, plan setup, and manual membership activation.

Files to create:

- `apps/admin-web/**`
- `services/api/src/modules/admin/**`
- `services/api/src/modules/cafes/**`
- `services/api/src/modules/plans/**`
