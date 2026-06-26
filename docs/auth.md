# Customer Web Auth

The customer web app supports two auth modes.

## Local Mock Mode

Default local development uses the typed mock API:

```sh
VITE_USE_MOCK_API=true
```

This keeps the QR -> login -> redeem -> verification-code flow runnable before AWS infrastructure exists.

## Cognito Hosted UI Mode

Set mock mode off and provide Cognito Hosted UI values:

```sh
VITE_USE_MOCK_API=false
VITE_API_BASE_URL="https://api.example.com/v1"
VITE_COGNITO_DOMAIN="https://your-domain.auth.ap-south-1.amazoncognito.com"
VITE_COGNITO_CLIENT_ID="your-public-app-client-id"
VITE_COGNITO_REDIRECT_URI="http://localhost:5173/auth/callback"
```

The app uses Authorization Code with PKCE:

- `Continue with Google` redirects to Cognito Hosted UI with `identity_provider=Google`.
- `/auth/callback` validates the returned state and exchanges the code for tokens.
- Access tokens are stored in `sessionStorage`, not `localStorage`.
- API requests include `Authorization: Bearer <accessToken>`.
- Logout clears local tokens and redirects through Cognito logout when configured.

Do not commit Google client secrets, Cognito secrets, or environment-specific URLs.

## Google IdP Setup

CDK can attach Google as a Cognito identity provider when these values are provided:

```sh
GOOGLE_CLIENT_ID="google-oauth-client-id"
GOOGLE_CLIENT_SECRET_NAME="/my-caffe/dev/google-client-secret"
COGNITO_DOMAIN_PREFIX="my-caffe-dev"
```

Store the Google OAuth client secret in AWS Secrets Manager under `GOOGLE_CLIENT_SECRET_NAME`. Do not store it in `.env`, source code, or CDK context files.

In Google Cloud Console, add the Cognito Hosted UI callback URL:

```txt
https://{COGNITO_DOMAIN_PREFIX}.auth.{AWS_REGION}.amazoncognito.com/oauth2/idpresponse
```

The customer web app callback remains:

```txt
https://dev.mycaffe.in/auth/callback
```

## Local API Integration Mode

Before Cognito infrastructure exists, you can run the customer web app against the local API skeleton using a non-secret development token:

```sh
VITE_USE_MOCK_API=false
VITE_API_BASE_URL="http://localhost:3000/v1"
VITE_DEV_ACCESS_TOKEN="demo-token"
```

Run both services:

```sh
pnpm dev:api
pnpm dev:customer
```

The local API currently accepts any non-empty bearer token. This is only for local integration testing and must be replaced by Cognito JWT verification before deployment.

## Deployed API Authorization

In CDK-managed environments, API Gateway verifies Cognito JWTs before invoking protected customer routes:

- `GET /v1/me`
- `GET /v1/me/redemptions`
- `POST /v1/redemptions`

Public routes remain unauthenticated:

- `GET /v1/health`
- `GET /v1/cafes/:slug`

The local `VITE_DEV_ACCESS_TOKEN` path is only for local development against `pnpm dev:api`.
