# Sebra headless storefront

Next.js (App Router) storefront on the Shopify Storefront API. Product data
comes from Shopify; checkout stays on Shopify's hosted checkout, so this app
never handles card data.

> **This has not been compiled.** The environment it was written in had no
> access to the npm registry, so `npm install`, `next build`, and `tsc` were
> never run against it. Expect to fix a small number of type or config errors
> on your first build. Run `npm run typecheck` before deploying.

## Architecture

```
app/
  layout.tsx                  root layout, global CSS, metadata
  page.tsx                    redirects to the featured product
  actions.ts                  server action: create cart -> checkout URL
  products/[handle]/page.tsx  server component, ISR (60s)
  globals.css                 the full flash-offer design
components/
  FlashOffer.tsx              client component: countdown, reveals, sticky bar
lib/
  catalog.ts                  shared types + pure helpers (client-safe)
  shopify.ts                  Storefront API client (server-only)
  offer-config.ts             sale deadline, stock %, disclaimer
```

`lib/shopify.ts` imports `server-only`, so it cannot be pulled into a client
bundle by mistake. Anything the browser needs lives in `lib/catalog.ts`.

The discount percentage is never hardcoded. It is derived from the live
Shopify `price` and `compareAtPrice` at render time, so the badge, urgency
strip, savings pill, and button text always agree with what the customer is
actually charged. Remove the compare-at price in Shopify and every discount
element disappears on its own.

## Setup

### 1. Get a Storefront API token

In Shopify admin: **Settings → Apps and sales channels → Develop apps →
Create an app → Configure Storefront API scopes**. Enable at minimum:

- `unauthenticated_read_product_listings`
- `unauthenticated_read_product_inventory`
- `unauthenticated_write_checkouts`
- `unauthenticated_read_checkouts`

Install the app and copy the **Storefront API access token**.

You can also use the **Headless** sales channel, which issues the same kind
of token with a nicer UI.

> Keep this token to yourself. It is a public/read-only token and it will be
> visible in server logs, but there is no reason to paste it into a chat
> window, a screenshot, or a commit. `.env.local` is gitignored.

### 2. Run locally

```bash
cp .env.example .env.local     # then fill in the token
npm install
npm run dev
```

Open http://localhost:3000 — it redirects to the featured product.

### 3. Push to GitHub

Target repo: https://github.com/sebradropships/getfit

Windows, from inside this folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\push-to-github.ps1
```

Or by hand:

```bash
git init
git branch -M main
git add -A
git commit -m "Headless Shopify storefront"
git remote add origin https://github.com/sebradropships/getfit.git
git push -u origin main
```

### 4. Deploy to Vercel

1. vercel.com → **Add New → Project** → import the repo.
2. Framework preset: **Next.js** (auto-detected). No build settings to change.
3. Add environment variables, for Production, Preview, and Development:
   - `SHOPIFY_STORE_DOMAIN` = `vfuvr4-df.myshopify.com`
   - `SHOPIFY_STOREFRONT_ACCESS_TOKEN` = your token
4. Deploy.

Env vars added after a deploy do not apply to it — redeploy after adding them.

## Before you point a domain at this

- **The Shopify storefront is still live.** Publishing this does not take the
  Helio theme down. Decide which one is canonical and redirect or password the
  other, or you will split your SEO and confuse customers.
- **Your store is on a trial plan.** You need a paid plan before checkout will
  accept real orders.
- **Storefront password.** While password protection is on, the Storefront API
  still works, but the Shopify-hosted checkout will not be reachable by
  customers. Turn it off when you go live.

## Compliance

`lib/offer-config.ts` carries the full notes. In short:

- `saleEndsAt` must be a real deadline. Not a rolling per-visitor timer.
- The compare-at price must be one you have genuinely offered for a
  reasonable period (16 CFR Part 233).
- `reviewSummary` stays `undefined` until you have real review data. The
  FTC's 2024 review rule carries civil penalties per violation.
- No weight-loss, metabolism, detox, circulation, inflammation, pain-relief,
  or sleep/melatonin claims — in copy **or imagery**. The FTC treats an
  implied claim the same as an express one.
