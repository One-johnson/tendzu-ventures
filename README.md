# Tendzu Ventures

Heavy Equipment Inventory & Sales Management System for a Ghanaian company selling heavy-duty machines.

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **ShadCN UI** (custom components)
- **Convex** (database & backend)
- **Custom Authentication** (admin-only today; manager + branch roles planned)
- **Vercel** (deployment)

## Features (current)

- Dashboard with inventory metrics, revenue, profit, and charts
- Machine inventory with detail view, CRUD, search, and stock status
- Optional **part number** on machines (no auto-generated ID/SKU)
- Categories for organizing machines
- Stock restocking with history tracking
- Sales hub with profit tracking, charts, and transaction history
- Business reports with Excel export (and PDF where enabled)
- In-app notifications for sales, restocking, and stock alerts
- Account settings (`/account`) and app settings (`/settings`)
- Logout confirmation with loading state

**Notes**

- Invoice **numbers** are still assigned on sales (`TV-YYYY-NNNNN`); invoice **PDF download** is currently disabled (`INVOICE_GENERATION_ENABLED` in `src/lib/constants.ts`).
- The app is a **single shared workspace** today: one stock pool, one sales/reports stream, one admin role.

## Planned — Multi-branch

Not implemented yet. Intended for later so one company can run multiple branches in the same app:

- **Manager** — oversees all branches; maintains the shared machine catalog; restocks a central **warehouse**; **assigns** stock quantities to each branch; views company-wide sales and reports
- **Branch administrator** — one per branch; sells from that branch’s stock only; sees restock history when stock is assigned to their branch; cannot see other branches or the warehouse
- **Stock flow**
  1. Manager restocks warehouse (e.g. +500 units of a machine)
  2. Manager allocates units to branches (e.g. 200 / 300)
  3. Warehouse stock decreases; each branch’s stock increases
  4. A **restock record** is created for each receiving branch
  5. Branch admins sell from branch stock only

## Getting Started

### Prerequisites

- Node.js 18+
- A [Convex](https://convex.dev) account

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Convex

```bash
npx convex dev
```

This will prompt you to log in and create a project. It generates `.env.local` with your Convex URL.

### 3. Seed the database

In a separate terminal (while `convex dev` is running):

```bash
npm run seed
```

Default admin credentials:
- **Email:** `admin@tendzuventures.com`
- **Password:** `Admin@123`

> Change the default password after first login at `/account`.

If upgrading an existing database, run once:

```bash
npx convex run seed:migrateToAdminOnly
npx convex run seed:backfillSaleProfit
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

## Deployment (Vercel)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add `NEXT_PUBLIC_CONVEX_URL` environment variable
4. Deploy Convex to production:

```bash
npx convex deploy
```

5. Run seed on production (once):

```bash
npx convex run seed:seedDatabase --prod
npx convex run seed:migrateToAdminOnly --prod
npx convex run seed:backfillSaleProfit --prod
```

## Project Structure

```
├── convex/           # Convex backend (schema, auth, queries, mutations)
├── src/
│   ├── app/          # Next.js App Router pages
│   ├── components/   # UI components, layout, providers
│   ├── lib/          # Utilities, formatters, export helpers
│   └── types/        # TypeScript types
├── src/proxy.ts      # Auth redirects (Next.js proxy)
```

## Business Rules

- Machine quantities update automatically after sales and restocking
- Sales cannot exceed available stock
- Revenue and profit are calculated from selling price and cost price
- Invoice numbers follow format `TV-YYYY-NNNNN`
- Low stock alerts trigger when quantity ≤ configurable threshold
- Part number is optional and entered manually when adding or editing a machine

## License

Private — Tendzu Ventures
