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
