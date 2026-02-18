# Stoq — Inventory & Order Management

Stoq is a **Next.js (App Router)** inventory + order management app backed by **Supabase**.  
It includes a public browsing experience, a user area, and a protected admin panel for managing inventory and orders.

## Features

- **Inventory browsing** (public)
- **Cart + checkout flow**
- **Orders**
  - Users can create/view their own orders
  - Admins can view/update all orders
- **Role-based access**
  - Admin routes under `/admin/*` are protected
  - Role is stored in `public.user_profiles.role` (`user` / `admin`)
- **Supabase RLS** (Row Level Security) for `user_profiles`, `inventory`, and `orders`
- **Modern UI** using Tailwind + shadcn/ui + Radix primitives

## Tech stack

- **Next.js 14** (App Router), **React 18**, **TypeScript**
- **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`)
- **Tailwind CSS** + **shadcn/ui**
- **Lucide** icons, **Sonner** toasts

## Routes

- **Public**
  - `/` — home
  - `/user` — user products page
- **Admin**
  - `/admin/login` — admin login (public)
  - `/admin/*` — protected admin area (requires auth + admin role)

Route protection is implemented via:

- **Middleware**: `src/lib/supabase/middleware.ts`
- **Client guard**: `src/lib/auth/AuthGuard.tsx` (wired in `app/admin/layout.tsx`)

More details: `PROTECTED_ROUTES.md`

## Getting started

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Copy the example env file:

```bash
copy .env.example .env.local
```

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> **Note:** Never commit `.env.local`. Use your hosting provider’s env settings for production.

### 3) Run migrations

You can run migrations from the Supabase Dashboard **SQL Editor** (recommended), in order:

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rls_policies.sql`
- `supabase/migrations/003_fix_rls_recursion.sql`
- `supabase/migrations/004_verify_and_fix_orders.sql`

Or use the helper scripts:

```bash
npm run migrate
npm run migrate:show
```

More details: `MIGRATION_GUIDE.md`

### 4) Seed the database

```bash
npm run seed
```

This creates sample users, inventory, and orders, including:

- **Admin**: `admin@stoq.com` / `admin123`
- **Users**: `user1@example.com` / `user123`, `user2@example.com` / `user123`

### 5) Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Useful scripts

```bash
npm run dev           # start local dev server
npm run build         # production build
npm run start         # start production server
npm run lint          # run eslint
npm run migrate       # run/verify migrations (helper)
npm run migrate:show  # print migration SQL
npm run seed          # create demo users + data
```

## Data model (high-level)

- **`auth.users`** (Supabase Auth): stores user accounts (email/password hash, etc.)
- **`public.user_profiles`**: app profile + role + business fields + cart snapshot
- **`public.inventory`**: inventory items
- **`public.orders`**: user orders (JSONB items + totals + status)

> If you don’t “see users” in the Table Editor, check **Supabase Dashboard → Authentication → Users**.  
> The Table Editor defaults to the `public` schema.

## Troubleshooting

### Admin login shows “Access denied”

This happens when `public.user_profiles.role` for your admin user is not `admin`.

- Run:

```bash
npm run seed
```

The seed script ensures the admin profile exists and sets the role to `admin`.

### RLS recursion / policy issues

If you see errors related to infinite recursion or RLS policy checks, ensure you applied:

- `supabase/migrations/003_fix_rls_recursion.sql`

See: `FIX_RECURSION.md`

## Deployment

This repo includes a `vercel.json` with:

```json
{ "framework": "nextjs" }
```

Deploy on Vercel (or similar) and configure the same environment variables in your hosting provider.

### Production standards (b2bmobiles.ca)

For a safe, repeatable workflow now that the app is live:

- **[Production standards](./docs/PRODUCTION_STANDARDS.md)** — Overview, pre-deploy checklist, and what to do if something goes wrong.
- **[Branching & workflow](./docs/BRANCHING_AND_WORKFLOW.md)** — Use `main` for production, `dev` for integration, and feature branches that merge into `dev` first.
- **[Environments & Supabase](./docs/ENVIRONMENTS_AND_SUPABASE.md)** — Separate Supabase projects for dev and production; how to manage env vars locally and in Vercel.
- **[Option B: Two projects setup](./docs/OPTION_B_TWO_PROJECTS_SETUP.md)** — Step-by-step for two Supabase projects, replicating prod → dev, clearing prod, Vercel envs, and domains (b2bmobiles.ca = production, stoq-bice.vercel.app = dev/preview).

## Project structure (quick)

- `app/` — Next.js App Router routes
- `src/components/` — shared UI components
- `src/page-components/` — page-level components
- `src/contexts/` — app state contexts (auth, profile, inventory, orders, cart)
- `src/lib/supabase/` — Supabase client/server helpers + middleware
- `supabase/` — migrations + scripts (seed/migrate)
