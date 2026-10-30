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
| Notifications | Branded emails for booking requests, acceptances, declines, payments, cancellations, driver assignment, delivery progress, disputes, reviews and vendor and truck review decisions |
| Vendors | Business profile, encrypted identity details, document uploads, submission for verification |
| Trucks | Registration, document uploads with expiry dates, photos, submission for review, availability, archiving |
| Administration | Review queues, vendor and truck decisions, document review, user suspension, booking oversight, offline payment recording, audit log |
| Marketplace | Vendors publish trips with capacity and per-kilogram pricing. Shippers describe a load, compare verified trucks with itemised prices, and request a booking. Vendors accept or decline. Capacity is reserved safely under concurrent requests |
| Payments | Paystack checkout for accepted bookings, verified server side through the callback and a signed webhook. A platform commission is split from each payment. Vendors register a payout bank account that Paystack verifies, and admins pay completed bookings by Paystack transfer or record a manual transfer. Refunds go back through Paystack. Bank transfers can still be recorded by administrators |
| Delivery | Vendors add drivers with licence details and assign them to confirmed bookings. Drivers sign in to their own area, record pickup, departure, delivery attempts, delivery and incidents with photo evidence. Shippers follow progress and confirm receipt, which releases the vendor payout |
| Reviews and disputes | Shippers rate completed bookings, and ratings appear on truck offers. Shippers and vendors can open a dispute with evidence. Administrators work the dispute queue, and payouts stay on hold until a dispute is closed |
| Settings and reports | Admins set the commission, minimum shipment weight, response, completion and dispute windows, accepted truck categories and the cargo category list, with a change history. A reports page shows booking value, revenue, refunds, payouts, money owed to vendors, cancellation and dispute rates, a value trend chart, top routes and vendors, and CSV exports for finance |
| Operations | Jobs that flag trucks with expired documents, expire unanswered booking requests and complete deliveries after 72 hours, each emailing the people affected. Command to create administrators |

Live GPS tracking, route optimisation and automated load matching are later phases in the PRD. Without a Paystack key, online checkout is hidden and administrators confirm bookings by recording bank transfer references.

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
| `CONTACT_WHATSAPP` | Yes | Public WhatsApp number in international form, for example `+2349031193739` |
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
| `PLATFORM_COMMISSION_BPS` | Yes | Initial platform commission in basis points (1000 is 10%). Used once to create the settings; after that the commission is changed in Admin, Settings |
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
| `npm run jobs:complete-deliveries` | Complete bookings delivered more than 72 hours ago without an open dispute, and make their payouts payable |

## Deployment

The test environment runs at https://wcelogistics.com:

| Piece | Where |
|---|---|
| App | Vercel project `wce-logistics`, London region (`lhr1`), deployed on every push to `master` |
| Database | Supabase project `wce-logistics-test` (London). The Supabase Vercel integration injects `POSTGRES_URL` (pooled, used by the app) and `POSTGRES_URL_NON_POOLING` (used for migrations) |
| Documents | Private S3 bucket `wcelogistics-test-documents` in `eu-west-2`, accessed by an IAM user limited by `infra/aws/s3-documents-policy.json` |
| Email | Resend, sending from `noreply@wcelogistics.com` |
| DNS | Porkbun: `A wcelogistics.com 76.76.21.21` and `CNAME www cname.vercel-dns.com` |
| Scheduled jobs | `.github/workflows/scheduled-jobs.yml` calls `/api/cron/<job>` with the `CRON_SECRET` repository secret |

Production builds run `scripts/deploy-migrate.ts` first, which applies migrations only when `VERCEL_ENV` is `production`. When `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_NAME` are set, the same step creates or promotes that administrator, which is how the first admin is created without copying database credentials. Secrets are added with `npx vercel env add NAME production --sensitive` and never committed.

## Production operations

- Migrations run automatically on production deployments. Run `npm run db:migrate` by hand only for other environments.
- Scheduled jobs run from GitHub Actions: `expire-bookings` every 15 minutes, `complete-deliveries` hourly and `expire-documents` daily. Each can also be started by hand from the Actions tab, or locally with `npm run jobs:<name>`.
- Keep the documents bucket private. Files are only ever served through short-lived signed links after an authorization check.
- Serve the app behind HTTPS. Session cookies use the `__Host-` prefix and the `Secure` flag in production.
- In the Paystack dashboard, set the webhook URL to `https://<your domain>/api/webhooks/paystack`. The callback URL is sent with each transaction, so it needs no dashboard setting.
- Set `PLATFORM_COMMISSION_BPS` to the agreed commission in basis points (1000 is 10%).
- The app reads the client address from `X-Forwarded-For` for rate limiting and the audit log, so deploy it behind a proxy that sets that header.

## Credits

Photography from [Unsplash](https://unsplash.com), used under the Unsplash License. Each image's source page is listed in `src/data/images.ts`.
