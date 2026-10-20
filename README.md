# WCE Logistics

Interstate logistics and truck booking platform for Nigeria. Move more. Build more.

The product requirements live in [docs/PRD.md](docs/PRD.md) and the brand guidelines in [brand/brand-guidelines.jpg](brand/brand-guidelines.jpg).

## Stack

- Next.js 16 (App Router) with TypeScript
- Tailwind CSS 4
- Brand tokens: navy `#0B2545`, orange `#FF6B00`, white `#FFFFFF`

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment variables

| Name | Required | Description |
|---|---|---|
| `CONTACT_EMAIL` | Yes | Address used by contact buttons, the FAQ, the footer and structured data |
| `SITE_URL` | Yes | Public origin of the site, for example `https://wcelogistics.com`. Used for canonical URLs, Open Graph, robots and the sitemap |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run test:e2e` | Build, serve and run the Playwright end-to-end suite on desktop and mobile Chrome |

## Credits

Photography from [Unsplash](https://unsplash.com), used under the Unsplash License. Each image's source page is listed in `src/data/images.ts`; the hero photograph is [x0tEfA567gY](https://unsplash.com/photos/gray-truck-on-asphalt-road-during-sunset-x0tEfA567gY).
