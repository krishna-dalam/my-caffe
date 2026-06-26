# AGENTS.md

## Project

This is a coffee subscription MVP.

Core MVP flow:
Cafe displays QR → customer scans QR → customer logs in with Google → customer redeems coffee → 4-digit verification code appears → staff visually verifies code → coffee count reduces.

## Tech stack

- Monorepo using pnpm workspaces
- React + TypeScript + Vite for web apps
- Node.js + TypeScript for backend
- AWS Lambda + API Gateway
- AWS Cognito with Google login
- DynamoDB
- AWS CDK
- Razorpay later, not in MVP

## Apps

- apps/customer-web: customer-facing web app
- apps/admin-web: admin app for managing cafes, plans, memberships, and redemptions
- services/api: backend API
- infra/cdk: AWS infrastructure
- packages/shared: shared types and validation helpers

## Rules

- Make small PR-sized changes only.
- Do not build a mobile app in MVP.
- Do not build cafe staff login in MVP.
- Do not integrate Razorpay yet.
- Use placeholder/manual subscription activation for MVP.
- Keep customer, admin, backend, infra, and shared code separate.
- Add tests for backend business logic.
- Do not introduce new libraries unless needed and explain why.
- Never commit secrets, AWS credentials, Google client secrets, or environment-specific values.
- Use .env.example files for required environment variables.
- Prefer simple readable code over over-engineered abstractions.

## Local development expectations

- Each app/service should have clear npm scripts.
- Root commands should support install, build, lint, test, and dev where possible.
- Backend business logic should be testable without AWS deployment.
- CDK code should be deployable after local MVP is working.

## MVP acceptance criteria

The MVP is complete when:

1. Customer can login with Google.
2. Admin can create a cafe.
3. Admin can create a subscription plan.
4. Admin can manually activate a customer's subscription.
5. Customer can view active subscription and remaining coffee count.
6. Customer can open a cafe QR link.
7. Customer can redeem one coffee.
8. System generates a 4-digit verification code.
9. Remaining coffee count reduces by 1.
10. Redemption history is stored.