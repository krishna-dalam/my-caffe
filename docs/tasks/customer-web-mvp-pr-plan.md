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

## PR 7: Backend Customer Service Layer

Status: implemented in this working tree.

Goal: move customer and redemption business rules behind service/repository boundaries before adding DynamoDB.

Files:

- `services/api/src/modules/customer/customerRepository.ts`
- `services/api/src/modules/customer/customerService.ts`
- `services/api/src/modules/customer/customerService.test.ts`
- `services/api/src/modules/customer/memoryCustomerRepository.ts`
- `services/api/src/http/router.ts`

Acceptance:

- Router delegates customer business behavior to `CustomerService`.
- Memory repository remains the local/demo persistence adapter.
- Service tests cover membership visibility, redemption count decrement, history storage, and exhausted subscription behavior.
- HTTP route behavior remains unchanged.

## PR 8: DynamoDB Repository Scaffold

Status: implemented in this working tree.

Goal: prepare the customer API for DynamoDB persistence while keeping memory as the local default.

Files:

- `services/api/src/config/env.ts`
- `services/api/src/db/dynamodbClient.ts`
- `services/api/src/modules/customer/repositoryFactory.ts`
- `services/api/src/modules/customer/dynamodb/keys.ts`
- `services/api/src/modules/customer/dynamodb/dynamoCustomerRepository.ts`
- `docs/data-model.md`

Acceptance:

- `CUSTOMER_REPOSITORY=memory` remains the default.
- `CUSTOMER_REPOSITORY=dynamodb` selects the DynamoDB repository adapter.
- DynamoDB table name is validated before adapter use.
- Single-table key shapes are covered by tests and documented.

## PR 9: DynamoDB Transactional Redemption Writes

Status: implemented in this working tree.

Goal: make DynamoDB persistence perform membership decrement and redemption record creation in one transaction.

Files:

- `services/api/src/modules/customer/customerRepository.ts`
- `services/api/src/modules/customer/customerService.ts`
- `services/api/src/modules/customer/memoryCustomerRepository.ts`
- `services/api/src/modules/customer/dynamodb/dynamoCustomerRepository.ts`
- `services/api/src/modules/customer/dynamodb/dynamoCustomerRepository.test.ts`
- `docs/data-model.md`

Acceptance:

- Repository boundary commits redemption and membership update as one operation.
- Memory adapter keeps existing local behavior.
- DynamoDB adapter writes a `TransactWriteCommand`.
- DynamoDB transaction condition checks expected remaining count and active status.
- Redemption put uses `attribute_not_exists` protection.

## PR 10: AWS CDK Foundation

Status: implemented in this working tree.

Goal: add a synthable AWS CDK foundation for the customer MVP.

Files:

- `infra/cdk/**`
- `docs/infrastructure.md`
- `package.json`

Acceptance:

- CDK app synthesizes after API build.
- DynamoDB table includes the documented primary key and GSI.
- Cognito User Pool and public web client are created.
- Lambda uses the built API handler asset.
- HTTP API exposes customer MVP routes.
- Table permissions are granted only to the API Lambda.

## PR 11: Dev Domain Hosting Foundation

Status: implemented in this working tree.

Goal: support deployment of the customer web app and API under the purchased `mycaffe.in` domain.

Files:

- `infra/cdk/lib/constructs/website.construct.ts`
- `infra/cdk/lib/constructs/api.construct.ts`
- `infra/cdk/lib/coffee-subscription-stack.ts`
- `infra/cdk/lib/config.ts`
- `docs/infrastructure.md`

Acceptance:

- CDK can host customer web assets from `apps/customer-web/dist` using S3 and CloudFront.
- CDK supports `dev.mycaffe.in` for web when a us-east-1 certificate ARN is provided.
- CDK supports `api.dev.mycaffe.in` for the HTTP API when a regional certificate ARN is provided.
- CDK can create Route 53 alias records when a deploy-account hosted zone is configured.
- Docs explain the management-account hosted-zone delegation/manual-record options.

## PR 12: Cognito JWT API Authorizer

Status: implemented in this working tree.

Goal: enforce Cognito JWT authorization for deployed protected customer API routes.

Files:

- `infra/cdk/lib/constructs/api.construct.ts`
- `infra/cdk/lib/coffee-subscription-stack.ts`
- `docs/auth.md`
- `docs/infrastructure.md`

Acceptance:

- `GET /v1/health` remains public.
- `GET /v1/cafes/{slug}` remains public for QR landing.
- `GET /v1/me` requires Cognito JWT authorization in deployed API Gateway.
- `GET /v1/me/redemptions` requires Cognito JWT authorization in deployed API Gateway.
- `POST /v1/redemptions` requires Cognito JWT authorization in deployed API Gateway.
- Local development token path remains local only.

## PR 13: Cognito Google IdP Infrastructure Wiring

Status: implemented in this working tree.

Goal: configure Cognito Hosted UI to support Google login without committing Google OAuth secrets.

Files:

- `infra/cdk/lib/constructs/auth.construct.ts`
- `infra/cdk/lib/config.ts`
- `infra/cdk/lib/coffee-subscription-stack.ts`
- `infra/cdk/.env.example`
- `docs/auth.md`
- `docs/infrastructure.md`

Acceptance:

- CDK supports optional Google identity provider configuration.
- Google OAuth client secret is referenced from Secrets Manager.
- Customer web app client supports Google when provider config is present.
- Docs include Google callback URL and secret storage instructions.

## PR 14: Cognito Customer Identity Mapping

Status: implemented in this working tree.

Goal: use authenticated Cognito JWT claims to scope customer API data instead of relying on a hardcoded demo customer ID.

Files:

- `services/api/src/http/types.ts`
- `services/api/src/http/router.ts`
- `services/api/src/http/router.test.ts`
- `services/api/src/modules/customer/repositoryFactory.ts`
- `services/api/src/modules/customer/memoryCustomerRepository.ts`
- `services/api/src/modules/customer/dynamodb/dynamoCustomerRepository.ts`
- `services/api/src/modules/customer/dynamodb/dynamoCustomerRepository.test.ts`
- `docs/auth.md`
- `docs/data-model.md`

Acceptance:

- API Gateway JWT authorizer claims are represented in API event types.
- Protected customer routes use Cognito `sub` as the backend `customerId`.
- DynamoDB profile, membership, and redemption queries are scoped to the authenticated customer.
- Local development bearer token still maps to `customer_demo_001`.
- Tests prove two Cognito subjects do not share redemption history.

## PR 15: Manual Customer Activation Script

Status: implemented in this working tree.

Goal: provide a safe placeholder activation path so a Cognito customer can be given an active coffee membership in DynamoDB before the admin app and Razorpay exist.

Files:

- `services/api/src/modules/customer/manualActivation.ts`
- `services/api/src/modules/customer/manualActivation.test.ts`
- `services/api/src/scripts/activateCustomer.ts`
- `services/api/package.json`
- `package.json`
- `docs/auth.md`
- `docs/data-model.md`

Acceptance:

- Activation creates cafe profile, cafe slug lookup, customer profile, and membership records.
- Activation records use Cognito `sub` as the customer ID.
- Default activation is non-overwriting to avoid resetting an existing dev subscription by accident.
- `--overwrite` is available for intentional dev resets.
- Unit tests cover the DynamoDB item shapes.

## PR 16: Customer Web Runtime Config Deployment

Status: implemented in this working tree.

Goal: let the deployed static customer web app receive API and Cognito values from CDK at runtime instead of baking deploy-time IDs into the Vite build.

Files:

- `apps/customer-web/.env.example`
- `apps/customer-web/src/config/env.ts`
- `apps/customer-web/src/config/env.test.ts`
- `apps/customer-web/src/main.tsx`
- `infra/cdk/lib/constructs/website.construct.ts`
- `infra/cdk/lib/coffee-subscription-stack.ts`
- `docs/auth.md`
- `docs/infrastructure.md`

Acceptance:

- Customer web loads `/config.json` before rendering.
- Local `.env` fallback still works when `/config.json` is unavailable.
- Runtime config can disable mock API and provide API/Cognito values.
- Runtime config never accepts `VITE_DEV_ACCESS_TOKEN`.
- CDK publishes `/config.json` with API base URL, Cognito domain, Cognito client ID, redirect URI, app name, and `useMockApi=false`.

## PR 17: Dev Deployment Runbook and Scripts

Status: implemented in this working tree.

Goal: provide the concrete operator path to deploy the customer MVP to `dev.mycaffe.in` once AWS credentials, certificates, Google OAuth, and DNS are ready.

Files:

- `package.json`
- `infra/cdk/package.json`
- `docs/deployment-dev.md`
- `docs/infrastructure.md`
- `README.md`

Acceptance:

- Root package exposes `pnpm infra:diff` and `pnpm infra:deploy`.
- CDK package exposes `pnpm diff` and `pnpm deploy`.
- Runbook documents required AWS/domain/Google/certificate environment.
- Runbook documents DNS options for management-account DNS versus delegated hosted zone.
- Runbook documents manual customer activation and customer smoke test steps.

## PR 18: Monorepo CI Verification

Status: implemented in this working tree.

Goal: run the same verification gates in GitHub Actions that are used locally before pushing each PR-sized slice.

Files:

- `.github/workflows/ci.yml`
- `README.md`
- `docs/tasks/customer-web-mvp-pr-plan.md`

Acceptance:

- CI runs on pull requests.
- CI runs on pushes to `main`.
- CI installs dependencies with `pnpm install --frozen-lockfile`.
- CI runs build, typecheck, lint, test, and CDK synth.
- CI has read-only repository permissions.

## PR 19: Manual Dev Deploy Workflow

Status: implemented in this working tree.

Goal: provide a controlled GitHub Actions path to deploy the dev customer MVP once the AWS OIDC role, certificates, Google OAuth settings, and DNS variables are configured.

Files:

- `.github/workflows/deploy-dev.yml`
- `package.json`
- `infra/cdk/package.json`
- `docs/deployment-dev.md`
- `README.md`
- `docs/tasks/customer-web-mvp-pr-plan.md`

Acceptance:

- Deploy workflow is manual-only through `workflow_dispatch`.
- Workflow uses GitHub OIDC with `id-token: write`.
- Workflow targets the protected `dev` environment.
- Workflow runs build, typecheck, lint, and tests before deploy.
- Workflow deploys CDK with `--require-approval never` through `pnpm infra:deploy:ci`.
- Runbook documents required GitHub secret and variables.

## PR 20: Cognito First-Login Customer Profile

Status: implemented in this working tree.

Goal: prevent first Google login from failing when the Cognito customer profile has not been manually seeded yet.

Files:

- `services/api/src/modules/customer/customerRepository.ts`
- `services/api/src/modules/customer/customerService.ts`
- `services/api/src/modules/customer/customerService.test.ts`
- `services/api/src/modules/customer/memoryCustomerRepository.ts`
- `services/api/src/modules/customer/dynamodb/dynamoCustomerRepository.ts`
- `services/api/src/modules/customer/dynamodb/dynamoCustomerRepository.test.ts`
- `services/api/src/http/router.ts`
- `services/api/src/http/router.test.ts`
- `docs/auth.md`
- `docs/data-model.md`
- `docs/tasks/customer-web-mvp-pr-plan.md`

Acceptance:

- `/v1/me` passes Cognito `sub`, `email`, and `name` claims into the customer service.
- DynamoDB adapter returns an existing customer profile without overwriting it.
- DynamoDB adapter conditionally creates the profile on first login when missing.
- Manual activation remains responsible for membership creation.
- Tests cover service, router, and DynamoDB first-login profile behavior.

## PR 21: Cafe QR Display Route

Status: implemented in this working tree.

Goal: support the first step of the MVP flow by giving cafes a displayable QR page that points customers to the scan/redemption route.

Files:

- `apps/customer-web/package.json`
- `apps/customer-web/src/App.tsx`
- `apps/customer-web/src/pages/QrDisplayPage.tsx`
- `apps/customer-web/src/pages/QrDisplayPage.test.ts`
- `apps/customer-web/src/styles/app.css`
- `README.md`
- `docs/deployment-dev.md`
- `docs/tasks/customer-web-mvp-pr-plan.md`
- `pnpm-lock.yaml`

Acceptance:

- `/qr/:slug` renders a cafe-facing QR display page.
- The QR encodes `/c/:slug` on the current origin.
- The QR is rendered as SVG without depending on canvas.
- The customer scan URL is visible as text for fallback.
- Tests cover scan URL generation and slug encoding.

## PR 22: Idempotent Manual Activation

Status: implemented in this working tree.

Goal: let dev activation run after first Google login has already created the customer profile, without accidentally overwriting an active membership.

Files:

- `services/api/src/modules/customer/manualActivation.ts`
- `services/api/src/modules/customer/manualActivation.test.ts`
- `services/api/src/scripts/activateCustomer.ts`
- `docs/auth.md`
- `docs/data-model.md`
- `docs/deployment-dev.md`
- `docs/tasks/customer-web-mvp-pr-plan.md`

Acceptance:

- Existing cafe seed records do not block activation.
- Existing customer profile records do not block activation.
- Existing membership records still block activation unless `--overwrite` is explicitly passed.
- Activation script logs skipped existing non-membership records.
- Tests cover the activation conflict policy.

## PR 23: Customer API Error Envelope Handling

Status: implemented in this working tree.

Goal: show useful backend error messages in the customer web app instead of generic HTTP status text.

Files:

- `apps/customer-web/src/api/coffeeApi.ts`
- `apps/customer-web/src/api/httpClient.ts`
- `apps/customer-web/src/api/httpClient.test.ts`
- `docs/tasks/customer-web-mvp-pr-plan.md`

Acceptance:

- Real API client unwraps success envelopes.
- Real API client reads backend error envelope messages.
- Non-JSON error responses still fall back to HTTP status text.
- API requests continue to include Hosted UI or dev bearer tokens.
- Tests cover success, structured error, and fallback error handling.

## PR 24: Cognito Hosted UI Environment Wiring

Goal: provision Cognito User Pool, Google IdP, and app client settings with AWS CDK.

Files to update/create:

- `apps/customer-web/.env.example`
- `apps/customer-web/src/auth/cognito.ts`
- `apps/customer-web/src/auth/AuthProvider.tsx`
- `apps/customer-web/src/pages/AuthCallbackPage.tsx`
- `docs/auth.md`

## PR 25: Subscription and Redemption API

Goal: add customer profile, membership lookup, and redemption APIs with testable service logic.

Files to create:

- `services/api/src/modules/customers/**`
- `services/api/src/modules/memberships/**`
- `services/api/src/modules/redemptions/**`
- `services/api/src/repositories/**`

## PR 26: AWS CDK Deployment Hardening

Goal: add deployable AWS infrastructure for Cognito, API Gateway, Lambda, and DynamoDB.

Files to create:

- `infra/cdk/package.json`
- `infra/cdk/bin/app.ts`
- `infra/cdk/lib/coffee-subscription-stack.ts`
- `infra/cdk/lib/constructs/auth.construct.ts`
- `infra/cdk/lib/constructs/api.construct.ts`
- `infra/cdk/lib/constructs/database.construct.ts`

## PR 27: Admin Manual Activation

Goal: add admin web and APIs for cafe setup, plan setup, and manual membership activation.

Files to create:

- `apps/admin-web/**`
- `services/api/src/modules/admin/**`
- `services/api/src/modules/cafes/**`
- `services/api/src/modules/plans/**`
