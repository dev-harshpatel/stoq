# Option B: Two Supabase Projects — Full Setup Guide

This guide walks you through **Option B**: one Supabase project for **Production** (b2bmobiles.ca) and one for **Development** (live testing at stoq-bice.vercel.app and local work). It includes replicating production data into development, clearing production when needed, and configuring Vercel and domains.

---

## Table of contents

1. [Overview: Two Projects, One Account](#1-overview-two-projects-one-account)
2. [Step 1: Create the Development Supabase Project](#2-step-1-create-the-development-supabase-project)
3. [Step 2: Environment Variables (.env.local vs Vercel)](#3-step-2-environment-variables-envlocal-vs-vercel)
4. [Step 3: Apply Migrations to Both Projects](#4-step-3-apply-migrations-to-both-projects)
5. [Step 4: Replicate Production Data into Development](#5-step-4-replicate-production-data-into-development)
6. [Step 5: Clear Production Database (When Required)](#6-step-5-clear-production-database-when-required)
7. [Step 6: Vercel Setup — Env per Environment & Domains](#7-step-6-vercel-setup--env-per-environment--domains)
8. [Step 7: Supabase CLI & Migration Workflow](#8-step-7-supabase-cli--migration-workflow)
9. [Daily Workflow (Put It All Together)](#9-daily-workflow-put-it-all-together)
10. [Checklists & Quick Reference](#10-checklists--quick-reference)

---

## 1. Overview: Two Projects, One Account

| Project         | Use for                                       | URL / Domain                                   |
| --------------- | --------------------------------------------- | ---------------------------------------------- |
| **Production**  | Live app (main branch)                        | **b2bmobiles.ca**                              |
| **Development** | Local dev, preview deploys (dev + feature/\*) | **stoq-bice.vercel.app** (preview) + localhost |

- **Critical rule:** Production Supabase keys **never** go in `.env` or `.env.local`. They live only in **Vercel → Production** environment variables.
- **Migrations** live in Git under `supabase/migrations/`. You run them on **dev first**, then on **production** when you’re ready to release.

---

## 2. Step 1: Create the Development Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New project**.
3. Name it e.g. **Stoq Dev** or **b2bmobiles-dev** (same organization, free tier is fine).
4. Choose region and database password; create the project.
5. When it’s ready, go to **Settings → API** and copy:

   - **Project URL**
   - **anon public** key
   - **service_role** key

   You’ll use these **only** for Development (`.env.local` and Vercel Preview/Development).

Your **existing** Supabase project = **Production** (used by b2bmobiles.ca). Don’t rename it; just treat it as prod.

---

## 3. Step 2: Environment Variables (.env.local vs Vercel)

### On your machine (development only)

Create or edit **`.env.local`** in the project root. Use **only** the **Development** project credentials:

```bash
# .env.local — DEV Supabase only. Never put production keys here.
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- Replace `your-dev-project-ref`, `your-dev-anon-key`, and `your-dev-service-role-key` with the values from the **Stoq Dev** project.
- **Never** put production Supabase keys in `.env` or `.env.local`.

### In Vercel (see [Step 6](#7-step-6-vercel-setup--env-per-environment--domains))

- **Production** env → Production Supabase URL and keys + `NEXT_PUBLIC_SITE_URL=https://b2bmobiles.ca`.
- **Preview** and **Development** env → Development Supabase URL and keys + `NEXT_PUBLIC_SITE_URL` = your preview URL (e.g. `https://stoq-bice.vercel.app` or leave default).

---

## 4. Step 3: Apply Migrations to Both Projects

Schema must be the same in both projects. Run all migrations in **both** Supabase projects.

### Option A: Supabase Dashboard (recommended when starting)

1. In **each** project (Production and Development): open **SQL Editor**.
2. Run the migration files in **order** (by filename / number).  
   Your migrations live under `supabase/migrations/`. Run them one by one, e.g.:
   - `001_initial_schema.sql`
   - `002_rls_policies.sql`
   - `003_fix_rls_recursion.sql`
   - … through the latest migration.

### Option B: npm script with direct DB connection (recommended for dev)

If you set **`DATABASE_URL`** (or **`SUPABASE_DB_URL`**) to your project’s **Postgres connection string**, `npm run migrate` will **run** pending migrations (not just list them).

1. Get the connection string: **Supabase Dashboard** → your project → **Settings** → **Database** → **Connection string** → **URI** (use Session pooler or Direct; replace `[YOUR-PASSWORD]` with the database password).
2. Add to **`.env.local`** (for dev only; never use production DB URL here):
   ```bash
   DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```
3. Run:
   ```bash
   npm run migrate
   ```
   Pending migrations will be executed in order and recorded in `schema_migrations`.

- **Development:** Use the **Development** project’s connection string in `.env.local` and run `npm run migrate`.
- **Production:** Do **not** put the production connection string in `.env`. Either run migrations manually in the **Production** project’s SQL Editor, or use a one-off env (e.g. `DATABASE_URL=... npm run migrate`) from a secure place and never commit it.

**Rule:** Never commit or share a `.env` that contains a production `DATABASE_URL`.

---

## 5. Step 4: Replicate Production Data into Development

This copies **data** (rows) from Production into Development so you can test with real-like data. Schema is already in place from migrations.

### 5.1 What gets replicated

- **public** schema tables that hold app data, e.g.:

  - `user_profiles`
  - `inventory`
  - `orders`
  - `tax_rates`
  - `company_settings`
  - `product_uploads`
  - `schema_migrations` (optional; can help keep migration state in sync)

- **auth.users** is managed by Supabase Auth. It is **not** copied by the steps below. Options:
  - **Option A:** Use dev-only test users (e.g. from `npm run seed`) and only replicate **public** data; user IDs in dev may not match prod, so you may need to fix or ignore FKs that reference `auth.users` (see notes below).
  - **Option B:** Export auth users from Production (Dashboard → Authentication → Users → export if available) and re-create them in Development manually or via script (advanced).

For a first-time replicate, **Option A** is simpler: replicate only **public** schema data; use seed or manual test users in dev.

### Why only some tables have data in dev

After running migrations on a **new** dev project you’ll see:

- **schema_migrations** — has rows because the migrate script records each migration it runs.
- **tax_rates** — has rows because migration `011_seed_tax_rates.sql` **inserts** seed data as part of the migration.
- **company_settings** — may have one row if migration `023_add_company_settings.sql` ran (it has an INSERT).

All other tables (**inventory**, **orders**, **user_profiles**, **product_uploads**, etc.) are **empty** because:

- Migrations only create the **schema** (tables, columns, indexes). They do **not** copy data from production.
- Dev is a separate database that started with no data; production data stays in the production project until you copy it.

To get real-like data in dev, you need to **replicate data from production** (steps below).

### 5.2 Get database connection strings

You need the **direct** Postgres connection string (not the pooler) for both projects.

1. **Production:** Supabase Dashboard → **Production** project → **Settings → Database**.

   - Under **Connection string** choose **URI**.
   - Copy the connection string. It looks like:
     ```text
     postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
     ```
   - For `pg_dump`/`psql`, use the **direct** connection if shown (port 5432 to the database host), or the **Session** pooler URI. Replace `[YOUR-PASSWORD]` with the database password (or the one you set for the project).

2. **Development:** Same steps in the **Development** project; copy its URI and password.

If your Dashboard shows **Connection string** with **Direct** and **Session** modes, use **Direct** for dump/restore when possible (fewer connection limits).

### 5.3 Export data from Production (public schema only)

On a machine with **PostgreSQL client tools** installed (`pg_dump`, `psql`):

```bash
# Set these for your PRODUCTION project (replace password and project-ref)
export PROD_DB_URL="postgresql://postgres.[prod-ref]:YOUR_PROD_PASSWORD@aws-0-xx.pooler.supabase.com:5432/postgres"

# Data-only export for public schema (no auth schema to avoid Supabase-managed tables)
pg_dump "$PROD_DB_URL" \
  --schema=public \
  --data-only \
  --no-owner \
  --no-privileges \
  -f prod_public_data.sql
```

- Use the **actual** production URI and password; do not commit `prod_public_data.sql` if it contains sensitive data (add `prod_public_data.sql` to `.gitignore`).
- If you have tables that reference `auth.users`, the exported data will still contain the prod `user_id` values. In dev, those UUIDs may not exist in `auth.users`. You can:
  - Restore anyway and accept that some rows may violate FK until you create matching users in dev, or
  - Edit `prod_public_data.sql` to replace user IDs with dev test user IDs, or
  - Omit tables that reference `auth.users` (e.g. `user_profiles`, `orders`, `product_uploads`) and only import e.g. `inventory`, `tax_rates`, `company_settings`.

### 5.4 Import data into Development

```bash
# Set this for your DEVELOPMENT project
export DEV_DB_URL="postgresql://postgres.[dev-ref]:YOUR_DEV_PASSWORD@aws-0-xx.pooler.supabase.com:5432/postgres"

# Restore data into dev (public schema)
psql "$DEV_DB_URL" -f prod_public_data.sql
```

- If you get foreign key errors (e.g. `user_id` in `user_profiles` or `orders` not in `auth.users`), you can:
  - Temporarily disable triggers and FKs (not recommended unless you know what you’re doing), or
  - Import only tables that don’t reference `auth.users` (e.g. `inventory`, `tax_rates`, `company_settings`), or
  - Create matching users in Development first (e.g. via Dashboard or seed script) then re-run the import.

### 5.5 Optional: Clear Development before replicating

If you want a **fresh** copy of production data in dev (wipe dev’s public data first):

1. In **Development** project → **SQL Editor**, run a script that truncates tables in a safe order (child tables first). Example (adjust table list to match your migrations):

```sql
-- Truncate public app tables (child tables first; schema_migrations optional)
TRUNCATE TABLE IF EXISTS product_uploads CASCADE;
TRUNCATE TABLE IF EXISTS orders CASCADE;
TRUNCATE TABLE IF EXISTS user_profiles CASCADE;
TRUNCATE TABLE IF EXISTS inventory CASCADE;
TRUNCATE TABLE IF EXISTS tax_rates CASCADE;
TRUNCATE TABLE IF EXISTS company_settings CASCADE;
-- Optional: TRUNCATE TABLE IF EXISTS schema_migrations CASCADE;
```

2. Then run the export/import steps above (export from prod, import into dev).

### 5.6 Add dump file to .gitignore

So you never commit production data:

```bash
echo "prod_public_data.sql" >> .gitignore
```

---

## 6. Step 5: Clear Production Database (When Required)

Use this **only** when you intentionally want to wipe production **data** (e.g. before a fresh go-live or after a decision to reset). This is **destructive** and cannot be undone without a backup.

### 6.1 Backup first (strongly recommended)

- Supabase Dashboard → **Production** project → **Database** → **Backups** (if available on your plan).
- Or run a full `pg_dump` of the production database to a file and store it somewhere safe.

### 6.2 Clear only app data (keep schema and migrations)

In **Production** project → **SQL Editor**, run (order matters for FKs):

```sql
-- DANGER: Production. Run only when you are sure.
TRUNCATE TABLE IF EXISTS product_uploads CASCADE;
TRUNCATE TABLE IF EXISTS orders CASCADE;
TRUNCATE TABLE IF EXISTS user_profiles CASCADE;
TRUNCATE TABLE IF EXISTS inventory CASCADE;
TRUNCATE TABLE IF EXISTS tax_rates CASCADE;
TRUNCATE TABLE IF EXISTS company_settings CASCADE;
```

- This keeps tables and migration history; only data is removed.
- **auth.users** is **not** truncated here (Supabase Auth). To remove users you’d use Dashboard → Authentication → Users and remove them, or use the Auth API.

### 6.3 Full reset (drop and re-run migrations)

Only if you want to drop **all** public schema objects and re-apply migrations from scratch:

1. In Production SQL Editor, drop public schema objects (or the whole `public` schema and recreate it). This is project-specific and risky; prefer the truncate approach unless you have a clear reason.
2. Re-run all migration files from `supabase/migrations/` in order in the SQL Editor.

**Rule:** Never run “clear production” or “drop schema” scripts without a backup and without being certain you’re in the **Production** project.

---

## 7. Step 6: Vercel Setup — Env per Environment & Domains

### 7.1 Environment variables per environment

In **Vercel** → your project → **Settings → Environment Variables**:

| Variable                        | Production                | Preview                                                 | Development                               |
| ------------------------------- | ------------------------- | ------------------------------------------------------- | ----------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | **Prod** project URL      | **Dev** project URL                                     | **Dev** project URL                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Prod** anon key         | **Dev** anon key                                        | **Dev** anon key                          |
| `SUPABASE_SERVICE_ROLE_KEY`     | **Prod** service role key | **Dev** service role key                                | **Dev** service role key                  |
| `NEXT_PUBLIC_SITE_URL`          | `https://b2bmobiles.ca`   | `https://stoq-bice.vercel.app` (or default preview URL) | `https://stoq-bice.vercel.app` or default |

- When adding each variable, select the right **Environment(s)**:
  - **Production** → only Production.
  - **Preview** and **Development** → Preview and Development (both use Dev Supabase).

So:

- Deploys from **main** → use **Production** env → **b2bmobiles.ca** (prod Supabase).
- Deploys from **dev** or **feature/\*** → use **Preview** env → **stoq-bice.vercel.app** (or Vercel’s default preview URL) (dev Supabase).

### 7.2 Git branch → deployment

- **Production branch:** Set to **`main`** in Vercel (Project Settings → Git).
- **Preview deployments:** Enable for **all** branches (or at least `dev` and `feature/*`). Every PR and push to non-main gets a preview URL.

### 7.3 Domains

- **b2bmobiles.ca**

  - Add as a **production** domain in Vercel and assign it to the **Production** deployment (branch `main`).
  - So: **b2bmobiles.ca** = production = main branch = Production Supabase.

- **stoq-bice.vercel.app**
  - This is Vercel’s default deployment URL. Use it for:
    - **Preview** deployments (any non-main branch), and/or
    - A dedicated “staging” deployment if you point one branch (e.g. `dev`) to it.
  - You can assign **stoq-bice.vercel.app** to the **Preview** environment in Vercel so that the “main” preview URL (e.g. from `dev`) is exactly that. In Vercel, under **Settings → Domains**, you can see which branch is used for the default `*.vercel.app` URL; typically the most recent preview or a branch you set.

Result:

- **b2bmobiles.ca** → Production (main) → Production Supabase.
- **stoq-bice.vercel.app** (or `*-git-dev-*.vercel.app`) → Preview / dev testing → Development Supabase.

### 7.4 Auth redirect URLs (Supabase)

- **Production** Supabase project: **Authentication → URL Configuration**

  - Site URL: `https://b2bmobiles.ca`
  - Redirect URLs: `https://b2bmobiles.ca/**`, `https://b2bmobiles.ca/auth/callback` (or your actual callback path).

- **Development** Supabase project: **Authentication → URL Configuration**
  - Site URL: `https://stoq-bice.vercel.app` (or your main preview URL)
  - Redirect URLs: `https://stoq-bice.vercel.app/**`, `https://stoq-bice.vercel.app/auth/callback`, `http://localhost:3000/**`, `http://localhost:3000/auth/callback`.

---

## 8. Step 7: Supabase CLI & Migration Workflow

Use the CLI to generate migrations and push to **dev first**, then to **prod** when ready.

### 8.1 Install and log in

```bash
npm install -g supabase
supabase login
```

### 8.2 Link to a project (dev or prod)

You link **one** project at a time. Get the **Project ref** from the Supabase Dashboard URL:  
`https://supabase.com/dashboard/project/<project-ref>`.

```bash
# Link to DEVELOPMENT first for daily work
supabase link --project-ref your-dev-project-ref
```

When you need to push to production, **re-link** to the production project:

```bash
supabase link --project-ref your-prod-project-ref
```

### 8.3 Creating and applying migrations

**Never** change the database schema directly in the Dashboard on production. Always use migration files.

```bash
# 1. Create a new migration file
supabase migration new add_product_table
# Creates: supabase/migrations/YYYYMMDDHHMMSS_add_product_table.sql

# 2. Edit the file and write your SQL

# 3. Ensure you're linked to DEV, then push to dev
supabase link --project-ref your-dev-project-ref
supabase db push

# 4. Test the app locally and on preview (stoq-bice.vercel.app / dev branch)

# 5. When ready for production: link to PROD and push (or run migrations manually in prod)
supabase link --project-ref your-prod-project-ref
supabase db push
```

**Alternative (no CLI):** Keep using your existing `supabase/migrations/` files and run them via **SQL Editor** (copy/paste) in Production when you’re ready, after testing on dev.

**Keep `supabase/migrations/` in Git.** This is your database version history.

---

## 9. Daily Workflow (Put It All Together)

1. `git checkout dev && git pull`
2. `git checkout -b feature/my-new-thing`
3. Code the feature (app uses dev Supabase via `.env.local` or Vercel Preview env).
4. If the DB schema changes: `supabase migration new <name>`, edit SQL, then `supabase db push` (linked to **dev**).
5. `git add . && git commit && git push` → open **PR into `dev`**.
6. Vercel deploys a preview → test at the preview URL (e.g. stoq-bice.vercel.app or the PR preview URL).
7. Merge PR into `dev` → test the `dev` deployment.
8. When confident: open **PR from `dev` → `main`**.
9. Merge to `main` → Vercel auto-deploys to **b2bmobiles.ca** (production).
10. If there were migrations: run them on **production** (e.g. `supabase link --project-ref prod-ref && supabase db push`, or run the new migration SQL in Production SQL Editor).

---

## 10. Checklists & Quick Reference

### Before replicating prod → dev

- [ ] Dev project exists and migrations are applied.
- [ ] You have Production and Development DB connection strings (Dashboard → Settings → Database).
- [ ] `pg_dump` / `psql` available (or use Dashboard export/import if you prefer).
- [ ] `prod_public_data.sql` is in `.gitignore`.

### Before clearing production

- [ ] Backup taken (Dashboard backups or `pg_dump`).
- [ ] You are in the **Production** project in the Dashboard.
- [ ] You have confirmed this is intentional and irreversible for the data you’re truncating.

### Env rules

- [ ] `.env.local` has **only** Development Supabase keys.
- [ ] Vercel **Production** has **only** Production Supabase keys.
- [ ] Vercel **Preview** / **Development** have **only** Development Supabase keys.

### Domain summary

| Domain                   | Branch  | Supabase    |
| ------------------------ | ------- | ----------- |
| **b2bmobiles.ca**        | `main`  | Production  |
| **stoq-bice.vercel.app** | Preview | Development |

---

For branching strategy and release process, see [BRANCHING_AND_WORKFLOW.md](./BRANCHING_AND_WORKFLOW.md) and [PRODUCTION_STANDARDS.md](./PRODUCTION_STANDARDS.md).
