# Architecture

This document records how WCE Logistics is put together and why. It covers the landing site and Phase 1 of the PRD (foundation: authentication, roles, vendor onboarding and verification, truck registration and document management).

## Overview

The application is a single Next.js 16 project. Server Components render pages, Server Actions handle every mutation, and a small set of server-only modules under `src/server` own data access, authentication, storage, email and payments. Nothing in `src/server` can be imported into client code (`server-only` guards it).

```
src/
  app/                  routes: marketing page, (auth), account, vendor, admin, files
  components/           ui kit, app shell, admin widgets, landing sections
  lib/                  code shared by client and server: validation, labels, formatting
  server/               server-only: env, db, auth, storage, sms, audit, domain rules
  proxy.ts              optimistic redirect for signed-out visitors
drizzle/                SQL migrations
scripts/                migrate, storage setup, create admin, document expiry job
e2e/                    Playwright tests and support (test database, email test server)
tests/unit/             Vitest unit tests
```

## Data

PostgreSQL with Drizzle ORM. The schema lives in `src/server/db/schema.ts` and every change ships as a SQL migration in `drizzle/`.

| Table | Purpose |
|---|---|
| `users` | One row per email address, plus a contact phone number. Role is `customer`, `vendor`, `driver` or `admin`, null until onboarding |
| `sessions` | Server-side sessions. Only a SHA-256 hash of the session token is stored |
| `otp_challenges` | One-time codes, stored as HMAC hashes with attempt counts and expiry |
| `vendor_profiles` | Vendor business details and verification status. ID numbers are encrypted |
| `vendor_documents` | Identity and business documents with review status |
| `trucks` | Truck specification and listing status. Registration numbers are unique among active listings |
| `truck_documents` | Vehicle documents with issue and expiry dates and review status |
| `truck_photos` | Truck photographs |
| `audit_logs` | Append-only record of sign-ins, submissions and every administrative decision |

## Authentication

- Users sign in with their email address and a 6-digit code sent by email. There are no passwords. A mobile number is collected during onboarding so shippers and vendors can arrange pickups, but it is not used to sign in.
- Codes are hashed with HMAC-SHA256 keyed by `AUTH_SECRET`, expire after 10 minutes and lock after 5 wrong attempts. A new code can be requested once a minute, at most 5 times per number and 20 times per network address per hour.
- Verifying a code creates the user if needed and opens a session. The session token is 32 random bytes, stored only as a hash, and sent as an `httpOnly`, `SameSite=Lax` cookie with the `__Host-` prefix in production. Sessions last 30 days and renew while in use.
- `src/proxy.ts` redirects visitors without a session cookie away from protected areas before rendering. This is an optimistic check only. Real authorization happens in `src/server/auth/dal.ts` (`requireUser`, `requireRole`), which every protected layout, page, Server Action and route handler calls.
- Suspending a user deletes all their sessions.

## Roles and access

| Role | Can access |
|---|---|
| Shipper (`customer`) | `/account` |
| Vendor | `/vendor`, their own profile, documents and trucks |
| Administrator | `/admin` and every document |
| Driver | Reserved for Phase 4 |

Administrators are never self-registered. They are created with `npm run admin:create`.

## Vendor verification

```
draft -> submitted -> under_review -> verified
                   \-> info_required -> (vendor edits) -> submitted
                   \-> rejected -> (vendor edits) -> submitted
verified <-> suspended
```

- Vendors can edit their details only in `draft`, `info_required` and `rejected`.
- Submission requires a complete profile, identity details and the documents their category needs: a government ID for everyone, a CAC certificate for registered companies, and an operating authority letter for fleet operators.
- Approval also approves the latest pending documents. Declining or requesting information requires a note the vendor can read.

## Truck verification

```
draft -> pending_verification -> active <-> unavailable
                              \-> draft (changes requested)
active / unavailable -> expired_documentation -> active (after new documents are approved)
any -> suspended -> active or draft
any (except under review or suspended) -> archived
```

- Submission requires the vehicle registration, proof of ownership, roadworthiness certificate and insurance certificate, all current, plus at least two photos.
- Approval requires the vendor to be verified.
- Editing an approved truck returns it to draft so it is reviewed again.
- `npm run jobs:expire-documents` moves active trucks with expired or missing required documents to `expired_documentation`. Approving a replacement document restores them.

## Marketplace

| Table | Purpose |
|---|---|
| `routes` | A trip: one truck, origin and destination, departure date, offered capacity, reserved capacity and prices |
| `shipments` | A shipper's load: addresses, cargo type, weight (at least 50 kg), pickup date, shared or dedicated |
| `bookings` | A request for a shipment on a trip, with a frozen, itemised quote and a unique reference such as `WCE-7KQ2M9XA` |
| `booking_events` | Every status change on a booking, with who made it and why |

- Money is stored in kobo as integers. Quotes are chargeable weight times the trip's rate, topped up to the trip's minimum charge when needed, or the trip's whole-truck price for dedicated bookings. The quote is copied onto the booking so later price changes never affect it.
- Search shows trips from verified vendors on active trucks, between the shipment's states, departing on the pickup date or up to 3 days after, that carry the cargo type and have room for the weight.
- Requesting a booking locks the shipment and trip rows, rechecks eligibility and capacity, then reserves the weight in the same transaction. Two shippers racing for the last space cannot both succeed.
- Booking statuses: `pending_vendor_acceptance` to `awaiting_payment` (vendor accepted) to `confirmed` (payment recorded). Declines, cancellations and expiry release the reserved capacity and reopen the shipment.
- Vendors have 24 hours to answer. `npm run jobs:expire-bookings` closes unanswered requests.
- Vendors see the shipper's contact details only after accepting.

## Documents and files

- Uploads are limited to 10 MB. The file type is detected from its content (PDF, JPG, PNG, WebP), not from its name or the browser's claim.
- Files are stored under random keys in a private bucket.
- `/files/[kind]/[id]` checks that the requester owns the file or is an administrator, then redirects to a signed link valid for 60 seconds. Other users get a 404.

## Sensitive data

- Identity numbers are encrypted with AES-256-GCM (`DATA_ENCRYPTION_KEY`). Only the last four characters are stored in plain text for display.
- Administrators reveal a full number on demand, and each reveal is written to the audit log.

## Email

Resend delivers sign-in codes and notifications. Every email has a plain text and a branded HTML version. Notifications are sent after the response with `after()`, so a slow or failing email provider never blocks a booking, and every attempt is recorded in the `notifications` table with its outcome. The `log` provider prints emails to the server console for local development and refuses to run when `NODE_ENV` is `production`.

## Testing

- Unit tests (`npm test`) cover email and phone normalization, encryption, validation, pricing and truck document rules.
- End-to-end tests (`npm run test:e2e`) build the app and run it with a separate `wce_logistics_test` database, a separate bucket and a local Resend-compatible email server, so the real email code path runs. They cover the landing page, metadata, sign-in and lockout, access control, the full vendor and truck review lifecycle, document access control and duplicate registration numbers, on desktop and mobile Chrome.

## Decisions

| Decision | Reason |
|---|---|
| Email sign-in without passwords | No SMS costs or sender ID registration, and codes arrive reliably. Phone numbers are still collected for coordination between shippers and vendors |
| Server-side sessions instead of signed tokens | Sessions can be revoked immediately when a user is suspended |
| Drizzle with SQL migrations | Readable migrations that run the same way locally and in production |
| S3-compatible storage | One code path for local SeaweedFS, AWS S3 and Cloudflare R2 |
| Partial prefetching disabled | The experimental flag left the address bar out of sync after some redirects |
| Kobo integers for money | Exact arithmetic with no floating point rounding |
| Offline payment recording before Paystack | Lets the business operate bookings now, with every payment reference in the audit log |
