# Cafe Onboarding

This document specifies the planned cafe onboarding feature. It is documentation only; the current implementation still uses manual cafe/customer activation for the MVP.

## Goal

Admin users can create and manage cafes, generate QR and customer redemption links, and print a QR poster for each cafe.

The customer-facing behavior remains:

```txt
Cafe displays QR -> customer scans QR -> customer opens /c/:slug -> customer redeems coffee
```

## User Flow

1. Admin opens the Cafes page.
2. Admin clicks Add Cafe.
3. Admin enters cafe profile and contact details.
4. Backend creates the cafe with a unique slug.
5. Admin lands on the cafe detail page.
6. Admin copies the QR display URL or customer redeem URL.
7. Admin prints a QR poster for the cafe.
8. Cafe displays the QR poster near the counter.
9. Customers scan the QR and redeem only when the cafe is active.

## Admin Cafe List Page

Route:

```txt
/admin/cafes
```

Purpose:

- Show all cafes available to the admin.
- Provide a clear Add Cafe action.
- Let admins scan status and basic cafe metadata quickly.

Recommended table columns:

- Cafe name
- Area
- City
- Status
- Contact name
- Contact phone
- Updated at
- Actions

Expected actions:

- Add Cafe
- View details
- Edit
- Copy customer redeem URL
- Open QR poster

Filters for later:

- Status: draft, active, inactive
- City
- Search by name, area, contact phone, or contact email

Empty state:

- If there are no cafes, show an Add Cafe primary action and a short explanation that cafes are required before QR posters can be printed.

## Admin Create Cafe Form

Route:

```txt
/admin/cafes/new
```

Fields:

- Cafe name
- Area
- City
- Contact name
- Contact phone
- Contact email
- Address
- Google Maps link
- Status: draft, active, inactive

Default status:

```txt
draft
```

Recommended behavior:

- Generate slug on the backend from cafe name, area, and city.
- Do not let the frontend decide final slug uniqueness.
- Show validation errors inline.
- After successful create, redirect to the cafe detail page.

Example form submission:

```json
{
  "name": "Blue Bottle Demo Cafe",
  "area": "Indiranagar",
  "city": "Bengaluru",
  "contactName": "Cafe Manager",
  "contactPhone": "+919876543210",
  "contactEmail": "manager@example.com",
  "address": "12th Main Road, Indiranagar, Bengaluru",
  "googleMapsUrl": "https://maps.google.com/?q=Indiranagar+Bengaluru",
  "status": "draft"
}
```

## Admin Cafe Detail Page

Route:

```txt
/admin/cafes/:cafeId
```

The page should show:

- Cafe info
- Contact info
- Status
- QR display URL
- Customer redeem URL
- Copy buttons
- Print QR poster button
- Edit cafe action

Displayed URLs:

```txt
QR display URL: /qr/:slug
Customer redeem URL: /c/:slug
```

In deployed dev, these become:

```txt
https://dev.mycaffe.in/qr/:slug
https://dev.mycaffe.in/c/:slug
```

Copy button behavior:

- Copy the full absolute URL.
- Show a short success state, for example “Copied”.
- Do not expose internal API URLs.

## QR Poster Behavior

Public QR route:

```txt
/qr/:slug
```

Purpose:

- Display a printable cafe QR poster.
- Encode the customer redeem URL:

```txt
/c/:slug
```

The poster should include:

- Cafe name
- Short instruction: “Scan to redeem your coffee pass”
- Large QR code
- Fallback short URL text
- Optional My Caffe branding

Print behavior:

- Admin can click Print QR poster from cafe detail.
- Browser opens or focuses `/qr/:slug`.
- Print CSS should hide non-poster navigation and produce a clean poster.
- The QR code should be high contrast and large enough for counter display.

Status behavior:

- QR poster may be visible for draft cafes if admins need to test or print ahead of launch.
- Customer redemption must still be blocked unless the cafe is active.
- Inactive cafes may show QR poster for admin/debug use, but the customer redeem page must not allow redemption.

## Cafe Status Rules

Statuses:

```txt
draft | active | inactive
```

`draft`:

- Cafe exists in admin.
- Cafe is not publicly redeemable.
- Admin can preview/copy links and print QR poster.
- Customer redeem page must block redemption.

`active`:

- Cafe is live.
- Customer redeem page can load.
- Authenticated customers with active memberships can redeem.

`inactive`:

- Cafe is disabled.
- Customer redeem page must block redemption.
- Existing historical data remains retained.
- Admin can view details and reactivate later if needed.

Public customer rule:

```txt
Only active cafes can be redeemed.
```

## API Contract

Base path:

```txt
/v1
```

Admin routes require Cognito authentication and MVP admin authorization through `ADMIN_EMAILS`.

Only authenticated users whose email matches a comma-separated entry in `ADMIN_EMAILS` can call admin routes.

### POST /v1/admin/cafes

Creates a cafe.

Request:

```json
{
  "name": "Blue Bottle Demo Cafe",
  "area": "Indiranagar",
  "city": "Bengaluru",
  "address": "12th Main Road, Indiranagar, Bengaluru",
  "googleMapsUrl": "https://maps.google.com/?q=Indiranagar+Bengaluru",
  "contactName": "Cafe Manager",
  "contactPhone": "+919876543210",
  "contactEmail": "manager@example.com",
  "status": "draft"
}
```

Response:

```json
{
  "data": {
    "cafeId": "cafe_abc123",
    "slug": "blue-bottle-demo-cafe-indiranagar-bengaluru",
    "name": "Blue Bottle Demo Cafe",
    "area": "Indiranagar",
    "city": "Bengaluru",
    "address": "12th Main Road, Indiranagar, Bengaluru",
    "googleMapsUrl": "https://maps.google.com/?q=Indiranagar+Bengaluru",
    "contactName": "Cafe Manager",
    "contactPhone": "+919876543210",
    "contactEmail": "manager@example.com",
    "status": "draft",
    "qrDisplayUrl": "https://dev.mycaffe.in/qr/blue-bottle-demo-cafe-indiranagar-bengaluru",
    "customerRedeemUrl": "https://dev.mycaffe.in/c/blue-bottle-demo-cafe-indiranagar-bengaluru",
    "createdAt": "2026-07-02T10:00:00.000Z",
    "updatedAt": "2026-07-02T10:00:00.000Z"
  },
  "requestId": "request_123"
}
```

### GET /v1/admin/cafes

Lists cafes for admin.

Query parameters:

- `status`
- `city`
- `q`
- `limit`
- `cursor`

Response:

```json
{
  "data": {
    "cafes": [
      {
        "cafeId": "cafe_abc123",
        "slug": "blue-bottle-demo-cafe-indiranagar-bengaluru",
        "name": "Blue Bottle Demo Cafe",
        "area": "Indiranagar",
        "city": "Bengaluru",
        "status": "draft",
        "contactName": "Cafe Manager",
        "contactPhone": "+919876543210",
        "contactEmail": "manager@example.com",
        "qrDisplayUrl": "https://dev.mycaffe.in/qr/blue-bottle-demo-cafe-indiranagar-bengaluru",
        "customerRedeemUrl": "https://dev.mycaffe.in/c/blue-bottle-demo-cafe-indiranagar-bengaluru",
        "createdAt": "2026-07-02T10:00:00.000Z",
        "updatedAt": "2026-07-02T10:00:00.000Z"
      }
    ]
  },
  "requestId": "request_123"
}
```

### GET /v1/admin/cafes/:cafeId

Returns one cafe for admin detail.

Response:

```json
{
  "data": {
    "cafeId": "cafe_abc123",
    "slug": "blue-bottle-demo-cafe-indiranagar-bengaluru",
    "name": "Blue Bottle Demo Cafe",
    "area": "Indiranagar",
    "city": "Bengaluru",
    "address": "12th Main Road, Indiranagar, Bengaluru",
    "googleMapsUrl": "https://maps.google.com/?q=Indiranagar+Bengaluru",
    "contactName": "Cafe Manager",
    "contactPhone": "+919876543210",
    "contactEmail": "manager@example.com",
    "status": "draft",
    "qrDisplayUrl": "https://dev.mycaffe.in/qr/blue-bottle-demo-cafe-indiranagar-bengaluru",
    "customerRedeemUrl": "https://dev.mycaffe.in/c/blue-bottle-demo-cafe-indiranagar-bengaluru",
    "createdAt": "2026-07-02T10:00:00.000Z",
    "updatedAt": "2026-07-02T10:00:00.000Z"
  },
  "requestId": "request_123"
}
```

### PATCH /v1/admin/cafes/:cafeId

Updates mutable cafe fields.

Request:

```json
{
  "area": "Indiranagar",
  "city": "Bengaluru",
  "status": "active"
}
```

Rules:

- Slug is stable after create. Name, area, or city updates do not regenerate it so printed QR posters and copied links keep working.
- Status changes must update `updatedAt`.

Response:

```json
{
  "data": {
    "cafeId": "cafe_abc123",
    "slug": "blue-bottle-demo-cafe-indiranagar-bengaluru",
    "name": "Blue Bottle Demo Cafe",
    "area": "Indiranagar",
    "city": "Bengaluru",
    "status": "active",
    "qrDisplayUrl": "https://dev.mycaffe.in/qr/blue-bottle-demo-cafe-indiranagar-bengaluru",
    "customerRedeemUrl": "https://dev.mycaffe.in/c/blue-bottle-demo-cafe-indiranagar-bengaluru",
    "createdAt": "2026-07-02T10:00:00.000Z",
    "updatedAt": "2026-07-02T10:30:00.000Z"
  },
  "requestId": "request_123"
}
```

### GET /v1/cafes/by-slug/:slug

Public cafe lookup by slug.

Purpose:

- Let `/qr/:slug` and `/c/:slug` resolve cafe data without knowing `cafeId`.

Response for active cafe:

```json
{
  "data": {
    "cafeId": "cafe_abc123",
    "slug": "blue-bottle-demo-cafe-indiranagar-bengaluru",
    "name": "Blue Bottle Demo Cafe",
    "area": "Indiranagar",
    "city": "Bengaluru",
    "address": "12th Main Road, Indiranagar, Bengaluru",
    "status": "active",
    "qrDisplayUrl": "https://dev.mycaffe.in/qr/blue-bottle-demo-cafe-indiranagar-bengaluru",
    "customerRedeemUrl": "https://dev.mycaffe.in/c/blue-bottle-demo-cafe-indiranagar-bengaluru"
  },
  "requestId": "request_123"
}
```

For draft/inactive cafes:

- QR display can return cafe metadata if needed for poster preview.
- Customer redeem flow must return a blocked state and must not allow redemption.

## DynamoDB Entity Shape

Single-table records:

```txt
PK                         SK
CAFE#{cafeId}              PROFILE
CAFE_SLUG#{slug}           PROFILE
```

Cafe profile item:

```json
{
  "PK": "CAFE#cafe_abc123",
  "SK": "PROFILE",
  "entityType": "Cafe",
  "cafeId": "cafe_abc123",
  "slug": "blue-bottle-demo-cafe-indiranagar-bengaluru",
  "name": "Blue Bottle Demo Cafe",
  "area": "Indiranagar",
  "city": "Bengaluru",
  "address": "12th Main Road, Indiranagar, Bengaluru",
  "googleMapsUrl": "https://maps.google.com/?q=Indiranagar+Bengaluru",
  "contactName": "Cafe Manager",
  "contactPhone": "+919876543210",
  "contactEmail": "manager@example.com",
  "status": "draft",
  "qrDisplayUrl": "https://dev.mycaffe.in/qr/blue-bottle-demo-cafe-indiranagar-bengaluru",
  "customerRedeemUrl": "https://dev.mycaffe.in/c/blue-bottle-demo-cafe-indiranagar-bengaluru",
  "createdAt": "2026-07-02T10:00:00.000Z",
  "updatedAt": "2026-07-02T10:00:00.000Z",
  "gsi1pk": "CAFES",
  "gsi1sk": "Bengaluru#Indiranagar#Blue Bottle Demo Cafe#cafe_abc123"
}
```

Slug lookup item:

```json
{
  "PK": "CAFE_SLUG#blue-bottle-demo-cafe-indiranagar-bengaluru",
  "SK": "PROFILE",
  "entityType": "CafeSlug",
  "cafeId": "cafe_abc123",
  "slug": "blue-bottle-demo-cafe-indiranagar-bengaluru",
  "status": "draft"
}
```

Recommended write behavior:

- Create cafe with a DynamoDB transaction.
- Put `CAFE#{cafeId}` profile item.
- Put `CAFE_SLUG#{slug}` lookup item with `attribute_not_exists(PK)` to enforce slug uniqueness.
- If slug collision occurs, append a short suffix and retry, for example `-a7f3`.

Recommended list index:

```txt
gsi1pk = CAFES
gsi1sk = {city}#{area}#{name}#{cafeId}
```

This supports the admin cafe list without scanning.

## Validation Rules

Required:

- `name`
- `area`
- `city`

Recommended required for activation:

- `contactName`
- `contactPhone`
- `address`

Field rules:

- `name`: 2-120 characters
- `area`: 2-80 characters
- `city`: 2-80 characters
- `address`: max 500 characters
- `googleMapsUrl`: valid `https://` URL when provided
- `contactName`: 2-120 characters when provided
- `contactPhone`: valid phone format, 10-15 digits after normalization
- `contactEmail`: valid email when provided
- `status`: `draft`, `active`, or `inactive`

Slug rules:

- Lowercase.
- Use letters, numbers, and hyphens.
- Collapse repeated hyphens.
- Trim leading/trailing hyphens.
- Must be unique.
- Should be generated by backend from name, area, and city.
- Should be stable after create unless a later product decision allows slug regeneration.

Security rules:

- Admin routes require admin auth.
- Public routes must not expose internal contact email/phone unless intentionally needed.
- Customer redemption must verify cafe status is active server-side.
- Client-side status checks are only UX hints, not authorization.

## Acceptance Criteria

- Admin can open Cafes page and see a list of cafes.
- Empty cafe list includes a clear Add Cafe action.
- Admin can create a cafe with name, area, city, contact details, address, maps link, and status.
- Backend generates a unique slug.
- Duplicate slug collisions are handled safely.
- Admin is redirected to cafe detail after create.
- Cafe detail shows cafe metadata.
- Cafe detail shows full QR display URL.
- Cafe detail shows full customer redeem URL.
- Copy buttons copy full URLs and show success feedback.
- Print QR poster button opens a printable QR poster.
- Public QR poster displays a scannable QR for `/c/:slug`.
- Public QR poster includes cafe name and fallback URL text.
- Customer redeem page resolves cafe by slug.
- Active cafes can be redeemed by eligible customers.
- Draft cafes cannot be redeemed.
- Inactive cafes cannot be redeemed.
- Public customer redemption is blocked server-side for draft/inactive cafes.
- Admin can update cafe status.
- Admin can update editable cafe metadata.
- API returns consistent success/error envelopes.
- API validates all input and returns `VALIDATION_ERROR` for invalid payloads.
- Cafe records are written using DynamoDB conditional writes or transactions.
- Slug lookup records enforce uniqueness.
- Tests cover create cafe, duplicate slug handling, list cafes, update cafe, public slug lookup, and redemption blocking for non-active cafes.
