# Implementation Plan and Status

This document tracks the WCE Logistics build against the product requirements in [PRD.md](PRD.md). Technical design is described in [ARCHITECTURE.md](ARCHITECTURE.md).

Last updated: 22 October 2026 (Phase 4 complete)

## Project scope

WCE Logistics is a web marketplace that connects people and businesses moving goods between Nigerian states with verified truck owners and logistics companies.

- **Shippers** describe a load, compare verified trucks with itemised prices, book, pay and follow the booking.
- **Vendors** register their business, get verified, list trucks with documents, publish trips with capacity and prices, and accept or decline bookings.
- **Drivers** carry out assigned deliveries and record pickup and delivery evidence.
- **Administrators** verify vendors and trucks, oversee bookings and money, resolve disputes and configure the platform.

The minimum shipment is 50 kg. Money is held in kobo and displayed in NGN. The first release is a responsive web application with status-based tracking. Live GPS, route optimisation and automated load matching are later phases.

### Technology

| Concern | Choice |
|---|---|
| Application | Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript |
| Styling | Tailwind CSS 4 with brand tokens |
| Database | PostgreSQL with Drizzle ORM and SQL migrations |
| File storage | S3-compatible storage (SeaweedFS locally, AWS S3 or Cloudflare R2 in production) |
| Email | Resend |
| Payments | Paystack |
| Testing | Vitest unit tests, Playwright end-to-end tests on desktop and mobile Chrome |

## Delivery plan

| Phase | Content | Status |
|---|---|---|
| 0. Marketing site | Landing page, SEO, brand, animation | Done |
| 1. Foundation | Authentication, roles, vendor verification, trucks, documents, admin review | Done |
| 2. Marketplace | Trips, shipments, search, pricing, booking workflow | Done |
| 3. Transactions | Paystack payments, commission, payouts, refunds, cancellations, email notifications | Done, waiting on live keys |
| 4. Delivery operations | Drivers, assignment, delivery statuses, evidence, reviews, disputes | Done |
| 5. Optimisation | GPS, route optimisation, automated matching, analytics | Not started |
| Launch | Hosting, production configuration, legal and compliance | Not started |

## What is done

### Phase 0: Marketing site

- [x] Landing page modelled on the approved design: hero with Nigeria route map, services, how it works (shipper and vendor tabs), verification, pricing, industries, vendor call to action, FAQ, footer
- [x] Real photography with an image registry and attribution
- [x] Header with dropdown menus and mobile menu
- [x] Scroll reveal and hover motion that respects reduced-motion settings
- [x] WCE logo watermark behind sections and oversized footer wordmark
- [x] SEO: metadata, Open Graph image, structured data, sitemap, robots, web manifest
- [x] Custom 404 and error pages
- [x] Accessibility, best practices and SEO scored 100 in Lighthouse

### Phase 1: Foundation

- [x] Email sign-in with six-digit one-time codes (hashed, 10 minute expiry, 5 attempts, resend cooldown, per-email and per-IP rate limits)
- [x] Onboarding as shipper or vendor with name and contact phone number
- [x] Server-side sessions in a secure, HTTP-only cookie, revocable on suspension
- [x] Role-based access for customer, vendor and admin areas
- [x] Vendor profile: category (individual owner, logistics company, fleet operator), legal and business name, address, operating states, CAC number
- [x] Identity number encrypted at rest (AES-256-GCM), only the last four digits shown, every admin reveal audited
- [x] Vendor document uploads with file type detection by content, private storage and short-lived signed download links
- [x] Vendor verification statuses: draft, submitted, under review, more information required, verified, rejected, suspended
- [x] Truck registration with category, tyre count, payload, body type and dimensions, cargo types, base location
- [x] Duplicate registration number detection
- [x] Truck documents with issue and expiry dates, and truck photos
- [x] Truck listing statuses: draft, pending verification, active, unavailable, suspended, expired documentation, archived
- [x] Admin review queues for vendors, trucks and individual documents with recorded reasons
- [x] Admin user list with suspend and reactivate
- [x] Audit log of sensitive actions
- [x] Daily job that takes trucks with expired documents off the market
- [x] Command to create administrator accounts

### Phase 2: Marketplace

- [x] Vendors publish trips per truck: origin and destination, departure date, transit time, capacity, rate per kg, minimum charge, optional whole-truck price, shared loads on or off
- [x] Pause, resume and cancel trips
- [x] Shippers create shipments with cargo type, weight (50 kg minimum), packages, pickup date, declared value, handling notes, shared or dedicated booking
- [x] Search returns only verified vendors, active trucks and open trips with enough capacity on the route and date
- [x] Itemised price shown before booking
- [x] Booking requests lock the trip and reserve capacity, so concurrent requests can never overbook
- [x] Unique booking references (`WCE-XXXXXXXX`)
- [x] Vendor accept or decline with reason; declines release capacity and reopen the shipment
- [x] Shipper and vendor cancellation with reason
- [x] Requests unanswered after 24 hours expire automatically (scheduled job)
- [x] Timestamped booking history showing who made each change

### Phase 3: Transactions

- [x] Email only: sign-in codes and all notifications by email through Resend, SMS removed
- [x] Branded HTML and plain-text emails for booking requested, accepted, declined, confirmed, cancelled, expired, refunded, and vendor and truck review decisions
- [x] Every email attempt recorded with its outcome
- [x] Paystack checkout from the booking page
- [x] Payment confirmed only after server-side verification with Paystack (a redirect is never trusted on its own)
- [x] Signed webhook with constant-time signature check; duplicate or replayed events change nothing
- [x] Amount, currency and reference checked on every settlement
- [x] Payment arriving after a booking closed is flagged for refund
- [x] Platform commission split on each payment (configurable in basis points)
- [x] Vendor payout record per payment, held until paid out
- [x] Admin Payments page with refunds due and refund through Paystack
- [x] Admin Payouts page with mark-as-paid and transfer reference
- [x] Vendor Earnings page
- [x] Offline bank transfer recording kept as a fallback

### Phase 4: Delivery operations

- [x] Vendors add drivers (name, email, phone, FRSC licence number, class, expiry); licence numbers encrypted and checked for duplicates
- [x] Driver invitation email; drivers sign in with the same email codes and land in their own area
- [x] Edit driver details, deactivate and reactivate (blocked while the driver has deliveries in progress)
- [x] Assign or change a driver on confirmed bookings with licence validity, licence class and schedule clash checks
- [x] Driver area: assigned deliveries with pickup and delivery addresses, cargo, handling notes and the shipper's phone, with no prices
- [x] Delivery updates: arrived at pickup, goods collected, departed, arrived at destination, delivery attempted, delivered (with recipient name), incident reports
- [x] Optional photo evidence on every update, served only to the booking's parties
- [x] Delivery progress timeline for shippers, vendors, drivers and admins
- [x] Shipper sees the assigned driver and confirms receipt
- [x] Automatic completion 72 hours after delivery when no dispute is open (scheduled job)
- [x] Payouts become payable only after completion, and never while a dispute is open
- [x] Cancellation allowed until the goods are collected
- [x] Ratings and reviews, one per completed booking, shown on truck offers and a vendor Reviews page
- [x] Admin review moderation (hide and restore with a reason)
- [x] Disputes by shipper or vendor with category, description and evidence, within 14 days of completion or cancellation
- [x] Dispute messages with attachments between shipper, vendor and the WCE team
- [x] Admin dispute queue: assign, under review, awaiting information, resolve or close with an outcome
- [x] Emails for driver assignment, goods collected, departure, failed attempts, delivery, incidents, completion, reviews and every dispute change

## What has been tested

All suites passed on the latest run. Two landing and sign-in tests can time out when the machine is under heavy load and pass when re-run on their own.

### Unit tests (75 tests, Vitest)

- [x] Email address and Nigerian phone number normalisation
- [x] Encryption and decryption of identity numbers
- [x] Form validation for profiles, trucks, trips and shipments
- [x] Pricing, minimum charge and kobo rounding
- [x] Truck document rules
- [x] Commission split never loses or invents a kobo
- [x] Paystack webhook signature acceptance and rejection
- [x] Delivery step order, repeated steps and status changes
- [x] Licence class coverage per truck type and the dispute window
- [x] Driver, delivery update, review and dispute validation

### End-to-end tests (40 scenarios, Playwright, desktop and mobile Chrome)

These run against a production build with a separate test database, a separate storage bucket, and local Resend and Paystack test servers, so the real email and payment code paths are exercised.

- [x] Landing page content, navigation, menus, tabs, keyboard use and images
- [x] SEO metadata, sitemap and robots
- [x] Sign-in with emailed code, wrong code lockout, onboarding, sign-out
- [x] Access control between customer, vendor and admin areas
- [x] Full vendor lifecycle: profile, documents, submission, admin review, truck review, activation
- [x] Document access control and duplicate registration numbers
- [x] Shipper books a truck, vendor accepts, payment confirms the booking, emails sent
- [x] Two shippers racing for the last capacity: exactly one succeeds
- [x] Declined request releases capacity and reopens the shipment
- [x] Paystack checkout confirms the booking once, with the correct 10% commission and vendor share
- [x] Webhook replay creates no duplicate payment, payout or email
- [x] Callback alone settles the payment when no webhook arrives
- [x] Abandoned checkout leaves the booking payable
- [x] Forged and unsigned webhooks rejected
- [x] Cancelled paid booking refunded through Paystack and payout cancelled
- [x] Payout stays on hold after payment and cannot be paid early
- [x] Vendor adds a driver, duplicate email rejected, driver signs in and records every delivery step with a photo
- [x] Shipper sees the driver and delivery progress, photo access limited to booking parties, receipt confirmed, review submitted and shown to the vendor, admin pays the vendor
- [x] Dispute with evidence holds the payout through completion, vendor and shipper reply, admin asks for information and resolves, payout released and both parties emailed
- [x] Drivers cannot see other drivers' deliveries; licences that do not cover the truck or expire before departure cannot be assigned; busy drivers cannot be deactivated; deactivated drivers lose access; cancellation blocked after collection

### Manual checks

- [x] Lighthouse audits on the landing page (accessibility, best practices, SEO at 100)
- [x] Visual review of every page on desktop and mobile widths
- [ ] Test with a real Paystack test account (needs keys)
- [ ] Test real email delivery from a verified Resend domain (needs keys)
- [ ] Test on physical Android and iOS phones and on slow networks

## What is left to do

### Needed from the business before launch

- [ ] Paystack secret key and the webhook URL set in the Paystack dashboard
- [ ] Resend API key and a verified sending domain
- [ ] Confirmed platform commission rate (10% is a placeholder)
- [ ] Real contact email address (`info@wcelogistics.com` is a placeholder)
- [ ] Payout policy: when a vendor share becomes payable
- [ ] Cancellation and refund policy wording
- [ ] Prohibited and restricted cargo policy
- [ ] Terms of service and privacy notice (NDPA)

### Phase 3 remaining

- [ ] Vendor payout bank account details, with optional Paystack transfer recipients for automatic payouts
- [ ] Partial refunds
- [ ] Reconciliation report against Paystack settlements
- [ ] In-app notification centre

### Phase 4 follow-ups

- [ ] Admin verification of driver licences (upload of the licence photo and an admin review queue)
- [ ] Admin driver list for oversight across vendors
- [ ] Emails when bookings expire or complete automatically (the scheduled jobs update records but do not send email yet)
- [ ] Email administrators when a new dispute is opened
- [ ] Vendor replies to reviews

### Admin configuration and reporting

- [ ] Admin settings for commission, minimum weight, cargo and truck categories (currently environment settings and code)
- [ ] Reports: active vendors, verified trucks, bookings, completed deliveries, cancellation rate, gross booking value, revenue, payout liabilities, dispute rate
- [ ] CSV export for finance

### Launch readiness

- [ ] Choose hosting for the app, PostgreSQL and object storage
- [ ] Production environment variables and secrets
- [ ] Custom domain with HTTPS
- [ ] Schedule the jobs (documents daily, bookings every 15 minutes, deliveries hourly)
- [ ] Database backups and a tested restore
- [ ] Error monitoring and uptime alerts
- [ ] Continuous integration running the unit and end-to-end tests on each push
- [ ] Load test search and booking against the PRD targets (API p95 under 500 ms, search under 2 s)
- [ ] Security review and penetration test
- [ ] Data retention rules for documents and identity data

### Phase 5: Optimisation (later)

- [ ] Live GPS tracking with consent and access controls
- [ ] Route optimisation and automated shared-load matching
- [ ] Analytics dashboards
- [ ] WhatsApp notifications
- [ ] Native mobile apps
