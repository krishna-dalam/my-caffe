# Data Model

The MVP uses a single DynamoDB table when `CUSTOMER_REPOSITORY=dynamodb`.

Local development defaults to `CUSTOMER_REPOSITORY=memory` so the webapp and API can run without AWS.

## Table

Environment variable:

```sh
COFFEE_TABLE_NAME=
```

Primary key:

- `PK`
- `SK`

Planned GSI:

- `GSI1PK`
- `GSI1SK`

## Key Shapes

```txt
CUSTOMER#{customerId}       PROFILE
CUSTOMER#{customerId}       MEMBERSHIP#{membershipId}
CUSTOMER#{customerId}       REDEMPTION#{redemptionId}
CAFE_SLUG#{slug}            PROFILE
CAFE#{cafeId}               PROFILE
```

GSI examples:

```txt
GSI1PK                      GSI1SK
CAFE#{cafeId}               MEMBERSHIP#{membershipId}
CAFE#{cafeId}               REDEMPTION#{redeemedAt}#{redemptionId}
```

## Current Status

The DynamoDB adapter commits redemptions with a transaction:

- conditionally update the membership only when the expected remaining count still matches and the membership is active
- insert the redemption record with `attribute_not_exists` protection

This prevents duplicated redemption records and avoids overwriting a concurrent membership update.
