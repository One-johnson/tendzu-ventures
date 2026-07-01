# Tendzu Ventures

Heavy Equipment Inventory & Sales Management System for a Ghanaian company selling heavy-duty machines.

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **ShadCN UI** (custom components)
- **Convex** (database & backend)
- **Custom Authentication** (admin-only)
- **Vercel** (deployment)

## Features

- Dashboard with inventory metrics, revenue, profit, and charts
- Machine inventory with detail view, CRUD, search, and stock status
- Stock restocking with history tracking
- Sales hub with profit tracking, charts, history, and invoice PDF download
- Business reports with PDF & Excel export (including profit)
- In-app notifications for sales, restocking, and stock alerts
- Account settings (`/account`) and app settings (`/settings`)

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
```

## Business Rules

- Machine quantities update automatically after sales and restocking
- Sales cannot exceed available stock
- Revenue and profit are calculated from selling price and cost price
- Invoice numbers follow format `TV-YYYY-NNNNN`
- Low stock alerts trigger when quantity ≤ configurable threshold

## License

Private — Tendzu Ventures
