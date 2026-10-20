# WCE Logistics

Interstate logistics and truck booking platform for Nigeria. Move more. Build more.

- Product requirements: [docs/PRD.md](docs/PRD.md)
- Architecture and Phase 1 decisions: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Brand guidelines: [brand/brand-guidelines.jpg](brand/brand-guidelines.jpg)

## What is built

| Area | Status |
|---|---|
| Marketing site | Landing page with services, how it works, verification, pricing, industries, vendor and FAQ sections |
| Authentication | Email sign-in with one-time codes, onboarding as shipper or vendor with a contact phone number, sessions, sign-out |
| Notifications | Branded emails for booking requests, acceptances, declines, payments, cancellations and vendor and truck review decisions |
| Vendors | Business profile, encrypted identity details, document uploads, submission for verification |
| Trucks | Registration, document uploads with expiry dates, photos, submission for review, availability, archiving |
| Administration | Review queues, vendor and truck decisions, document review, user suspension, booking oversight, offline payment recording, audit log |
| Marketplace | Vendors publish trips with capacity and per-kilogram pricing. Shippers describe a load, compare verified trucks with itemised prices, and request a booking. Vendors accept or decline. Capacity is reserved safely under concurrent requests |
| Payments | Paystack checkout for accepted bookings, verified server side through the callback and a signed webhook. A platform commission is split from each payment, vendor payouts are tracked until paid, and refunds go back through Paystack. Bank transfers can still be recorded by administrators |
| Operations | Jobs that flag trucks with expired documents and expire unanswered booking requests, command to create administrators |

Driver assignment, delivery tracking, ratings and disputes are later phases in the PRD. Without a Paystack key, online checkout is hidden and administrators confirm bookings by recording bank transfer references.

## Stack

- Next.js 16 (App Router, Cache Components) with TypeScript
- Tailwind CSS 4
- PostgreSQL 16 with Drizzle ORM and SQL migrations
- S3-compatible object storage for private documents (SeaweedFS locally, AWS S3 or Cloudflare R2 in production)
- Resend for email delivery
- Playwright end-to-end tests and Vitest unit tests

## Local setup

Requirements: Node.js 20 or newer and Docker Desktop.

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`. Generate the secrets with:

```bash
node -e "console.log('AUTH_SECRET=' + require('crypto').randomBytes(32).toString('base64url'))"
node -e "console.log('DATA_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
```

For local development set `EMAIL_PROVIDER=log` so sign-in codes and notifications are printed in the server console instead of being sent. Then start the services, prepare the database and storage, and run the app:

```bash
npm run services:up
npm run db:migrate
npm run storage:setup
npm run dev
```

Create the first administrator, then sign in with that number at `/sign-in`:

```bash
npm run admin:create -- --email ada@wcelogistics.com --name "Ada Obi"
```

## Environment variables

| Name | Required | Description |
|---|---|---|
| `CONTACT_EMAIL` | Yes | Public contact address used across the site |
| `SITE_URL` | Yes | Public origin, for example `https://wcelogistics.com` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `POSTGRES_PASSWORD` | Local only | Password for the local Postgres container |
| `AUTH_SECRET` | Yes | At least 32 characters. Keys the one-time code hashes |
| `DATA_ENCRYPTION_KEY` | Yes | 32 bytes, base64. Encrypts identity numbers at rest. Changing it makes stored numbers unreadable |
| `EMAIL_PROVIDER` | Yes | `resend` in production, `log` for local development only |
| `EMAIL_FROM` | Yes | Sender, for example `WCE Logistics <noreply@wcelogistics.com>`. The domain must be verified in Resend |
| `RESEND_API_KEY` | With Resend | Resend API key |
| `RESEND_BASE_URL` | No | Defaults to `https://api.resend.com` |
| `PAYSTACK_SECRET_KEY` | No | Paystack secret key. Leave empty to disable online checkout |
| `PAYSTACK_BASE_URL` | No | Defaults to `https://api.paystack.co` |
| `PLATFORM_COMMISSION_BPS` | Yes | Platform commission in basis points, for example `1000` for 10% |
| `STORAGE_ENDPOINT` | Non-AWS | S3 endpoint, for example the R2 or local SeaweedFS URL. Leave empty for AWS S3 |
| `STORAGE_REGION`, `STORAGE_BUCKET` | Yes | Bucket location and name |
| `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | Yes | Storage credentials |
| `STORAGE_FORCE_PATH_STYLE` | No | `true` for SeaweedFS and most self-hosted S3 servers |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm run start` | Production build and server |
| `npm run lint` | ESLint |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end suite against a production build, an isolated test database and a local email test server |
| `npm run services:up` / `services:down` | Start or stop local Postgres and object storage |
| `npm run db:generate` | Generate a migration after changing `src/server/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run storage:setup` | Create the private documents bucket |
| `npm run admin:create` | Create or promote an administrator |
| `npm run jobs:expire-documents` | Flag trucks whose required documents have expired |
| `npm run jobs:expire-bookings` | Expire booking requests the vendor did not answer within 24 hours and release their capacity |

## Production operations

- Run `npm run db:migrate` before each deployment that includes new migrations.
- Schedule `npm run jobs:expire-documents` to run daily, for example at 00:30 Africa/Lagos.
- Schedule `npm run jobs:expire-bookings` to run every 15 minutes.
- Keep the documents bucket private. Files are only ever served through short-lived signed links after an authorization check.
- Serve the app behind HTTPS. Session cookies use the `__Host-` prefix and the `Secure` flag in production.
- In the Paystack dashboard, set the webhook URL to `https://<your domain>/api/webhooks/paystack`. The callback URL is sent with each transaction, so it needs no dashboard setting.
- Set `PLATFORM_COMMISSION_BPS` to the agreed commission in basis points (1000 is 10%).
- The app reads the client address from `X-Forwarded-For` for rate limiting and the audit log, so deploy it behind a proxy that sets that header.

## Credits

Photography from [Unsplash](https://unsplash.com), used under the Unsplash License. Each image's source page is listed in `src/data/images.ts`.
