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

This slice adds the DynamoDB adapter scaffold, key helpers, and environment selection. Transactional membership decrement plus redemption writes will be enabled in a follow-up slice after CDK provisions the table.
