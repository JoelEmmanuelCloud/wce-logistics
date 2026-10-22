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
| Driver | `/driver`, only the bookings currently assigned to them, without prices or vendor finances |

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
- Booking statuses: `pending_vendor_acceptance` to `awaiting_payment` (vendor accepted) to `confirmed` (payment recorded), then through delivery (see below) to `completed`. Declines, cancellations and expiry release the reserved capacity and reopen the shipment. Shippers and vendors can cancel until the goods are collected; after that only an administrator can.
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

## Payments

- Paying starts from the booking page. The server creates a `payments` row with a unique reference (`<booking reference>-<6 characters>`), then sends the shipper to Paystack checkout.
- Payment state is only ever changed after the server calls Paystack's verify endpoint. The browser callback and the `charge.success` webhook both run the same settlement, which locks the payment and booking rows, so whichever arrives first settles it and the other is a no-op.
- Settlement checks the reference, amount and currency against the stored payment. A mismatch fails the payment and writes an audit entry.
- A payment that succeeds after the booking was cancelled or expired is kept as successful and flagged for refund on the admin Payments page.
- Webhooks are rejected with 401 unless the `x-paystack-signature` HMAC-SHA512 matches the secret key, compared in constant time.
- On success the commission (`PLATFORM_COMMISSION_BPS`) and vendor share are stored on the payment, and a payout row holds the vendor share (`on_hold`). It becomes `eligible` when the booking completes, and an administrator can only mark an eligible payout as paid, never while a dispute is open.
- Refunds are issued from the admin Payments page through the Paystack refund API, and the related payout is cancelled.
- Vendors add a payout bank account from the Earnings page. The bank comes from Paystack's bank list, the account name is resolved through Paystack, and a transfer recipient is created. The account number is encrypted and only the last four digits are shown. The vendor is emailed whenever the account changes.
- An eligible payout can be paid by Paystack transfer. The payout moves to `processing` with a unique `wce-po-...` reference before the transfer is requested. `transfer.success`, `transfer.failed` and `transfer.reversed` webhooks are verified against Paystack's transfer verify endpoint before the payout changes: success marks it `paid` and emails the vendor once, failure returns it to `eligible` with the reason so it can be retried. If the transfer request itself errors, the app checks whether Paystack created the transfer before treating it as failed, so a retry can never pay twice.
- Manual payouts remain available: an administrator records the bank transfer reference.

## Delivery operations

- Vendors add drivers with name, email, phone and FRSC licence details. The licence number is encrypted (AES-256-GCM) and indexed by an HMAC so the same licence cannot be registered twice. Adding a driver creates a `driver` user that signs in with the same email codes as everyone else.
- A driver can be assigned to a `confirmed` or `pickup_scheduled` booking when their licence is valid on the departure date, their class covers the truck (C: light trucks, E: rigid goods vehicles, G: articulated and low-loaders, see `src/lib/delivery.ts`) and they are not on another trip on overlapping dates. Assignment moves the booking to `pickup_scheduled`.
- Delivery updates are a state machine in `src/lib/delivery.ts`: arrived at pickup, goods collected (`goods_collected`), departed (`in_transit`), arrived at destination, delivery attempted (`delivery_attempted`), delivered (`delivered`), and incidents at any stage. Out-of-order or repeated steps are refused under a row lock. Each update is a `delivery_events` row with the actor, a note, the recipient name for deliveries and an optional photo.
- The shipper confirms receipt, or `jobs:complete-deliveries` completes the booking 72 hours after delivery when no dispute is open. Completion makes the payout `eligible`.
- Delivery photos and dispute attachments are served through `/files/...` only to the booking's shipper, vendor, assigned driver (photos only) and administrators.

## Reviews and disputes

- A shipper can review a completed booking once (1 to 5 with an optional comment). Published reviews feed the vendor rating shown on offers. Administrators can hide a review with a recorded reason.
- A shipper or vendor can open one active dispute per paid booking, while it is in progress or up to 14 days after it is completed or cancelled. Opening a dispute puts the payout back on hold.
- Disputes move through `open`, `under_review`, `awaiting_information`, `resolved` and `closed`. A party replying to `awaiting_information` moves it back to `under_review`. Closing requires an outcome, which is emailed to both parties and releases the payout if the booking is completed. Refunds stay a separate, explicit action on the Payments page.

## Settings

- `platform_settings` is a single row holding the commission, minimum shipment weight, vendor response window, automatic completion window, dispute window and disabled truck categories. It is created on first use from `PLATFORM_COMMISSION_BPS` and the defaults (50 kg, 24 hours, 72 hours, 14 days), and is read once per request.
- Validation schemas take the live policy as a parameter, so the same rules apply in forms, server actions and services. Rules apply to new records only: a booking keeps the response deadline, price and commission it started with, and a shipment created under a lower minimum can still be quoted.
- Cargo categories live in `cargo_categories`. Retiring a category hides it from forms while existing shipments and trucks keep it; a truck that already uses a retired category or a disabled truck category can still be edited.
- Every change is written to the audit log with the old and new values, and shown as the settings history.

## Reports

- Money is counted by payment date in Lagos time: gross booking value is every confirmed payment, revenue is the commission on payments that were not refunded, and refunds are counted against the period of the original payment. Money owed to vendors is a live total of payouts on hold, ready or being transferred.
- The value trend uses daily buckets up to a month, weekly for 90 days and monthly beyond, with empty buckets filled so gaps are visible. The chart is an SVG with a hover or tap tooltip and an equivalent table for screen readers.
- CSV exports (payments, payouts, bookings) are served only to active administrators, audited, and protected against spreadsheet formula injection by prefixing cells that start with `=`, `+`, `-` or `@`.

## Scheduled jobs

The jobs in `scripts/` run with `node --conditions=react-server --import tsx`, which lets them use the same services as the app instead of their own SQL. They therefore follow the same rules, write the same audit entries and send the same emails. System actions are audited without an IP address because there is no request.

## Testing

- Unit tests (`npm test`) cover email and phone normalization, encryption, validation, pricing, commission splits, webhook signatures, truck document rules, delivery steps, licence coverage and dispute windows.
- End-to-end tests (`npm run test:e2e`) build the app and run it with a separate `wce_logistics_test` database, a separate bucket, a local Resend-compatible email server and a local Paystack-compatible server (checkout, verification, refunds, banks, account resolution, recipients and transfers), so the real email and payment code paths run. The scheduled jobs are run as real processes against the test database after the other suites finish. They cover the landing page, metadata, sign-in and lockout, access control, the full vendor and truck review lifecycle, document access control, duplicate registration numbers, the booking marketplace, Paystack checkout, webhook replay and forged signatures, refunds, drivers and licence checks, delivery updates with photos, receipt confirmation, reviews, disputes, settings changes and their effect on forms, bookings and commission, reports and CSV exports, payout bank accounts, Paystack transfers including failures and duplicate webhooks, and the scheduled jobs and their emails, on desktop and mobile Chrome.

## Decisions

| Decision | Reason |
|---|---|
| Email sign-in without passwords | No SMS costs or sender ID registration, and codes arrive reliably. Phone numbers are still collected for coordination between shippers and vendors |
| Server-side sessions instead of signed tokens | Sessions can be revoked immediately when a user is suspended |
| Drizzle with SQL migrations | Readable migrations that run the same way locally and in production |
| S3-compatible storage | One code path for local SeaweedFS, AWS S3 and Cloudflare R2 |
| Partial prefetching disabled | The experimental flag left the address bar out of sync after some redirects |
| Kobo integers for money | Exact arithmetic with no floating point rounding |
| Paystack with offline recording as a fallback | Card, transfer and USSD checkout for shippers, while bank transfers outside Paystack can still confirm a booking with the reference in the audit log |
| Payouts only after completion | Vendors are paid once the shipper confirms receipt or the 72-hour window passes, so disputes can still hold the money |
| Disputes do not change the booking status | The booking keeps its delivery status, and the dispute has its own lifecycle and audit trail |
| Verify before trusting any payment signal | Callback query strings and webhooks can be replayed or forged, so only Paystack's verify response changes payment state |
