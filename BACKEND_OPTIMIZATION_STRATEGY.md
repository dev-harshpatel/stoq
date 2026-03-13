## Backend Optimization Strategy

This document outlines how to make the current `stoq` backend faster, more scalable, and more reliable from a senior developer point of view.

The recommendations are based on the current architecture in:

- `app/api`
- `src/lib/supabase/queries`
- `src/contexts`
- the app-router pages under `app`

Current stack:

- Next.js 14
- Supabase
- React Query
- Client-heavy Supabase data access
- Realtime subscriptions on the frontend

---

## 1. Executive Summary

The app is functional, but the backend/data layer is currently optimized more for development speed than scale.

The biggest opportunities are:

1. Move more reads from the browser to server-side query boundaries.
2. Replace repeated row-fetching with SQL aggregates, RPCs, and indexed search.
3. Reduce expensive `count: "exact"` pagination and broad realtime subscriptions.
4. Add caching, rate limiting, idempotency, and observability.
5. Introduce a clearer separation between transactional workloads and reporting workloads.

If these are implemented well, the system should gain:

- Faster page loads
- Lower Supabase query volume
- Better scalability under more users/data
- Fewer production incidents
- Easier debugging and safer future growth

---

## 2. Current Architecture Observations

### 2.1 Browser-side querying is doing too much

Several query functions use the browser Supabase client directly, including:

- `src/lib/supabase/queries/inventory.ts`
- `src/lib/supabase/queries/orders.ts`
- `src/lib/supabase/queries/stats.ts`
- `src/lib/supabase/queries/users.ts`

This is okay for small systems, but at scale it creates problems:

- More network round trips from the client
- More duplicate queries across users
- Less control over caching and throttling
- Harder to protect heavy queries
- More coupling between UI state and DB shape

### 2.2 Some queries pull more rows than needed

Examples:

- `fetchFilterOptions()` loads all `brand` and `storage` values from `inventory` and deduplicates in JavaScript.
- `fetchInventoryStats()` and parts of `fetchOrderStats()` load rows and aggregate in JS instead of SQL.
- `fetchAllFilteredInventory()` can load entire filtered datasets for export.

This will degrade as inventory/orders grow.

### 2.3 Exact-count pagination is costly

Several paginated queries use:

- `.select(..., { count: "exact" })`

This is convenient, but exact counts get expensive on larger tables, especially with filters.

### 2.4 Admin email lookup is N+1

`app/api/users/emails/route.ts` loops through `userIds` and calls:

- `supabaseAdmin.auth.admin.getUserById(userId)`

one-by-one.

This is workable for a handful of users, but poor for scalability and reliability.

### 2.5 Realtime is broad and always-on

`src/contexts/RealtimeContext.tsx` subscribes to:

- `inventory`
- `orders`
- `user_profiles`

on mount, globally.

That means:

- users/pages that do not need realtime still open sockets
- every DB change can cause client churn
- websocket overhead grows with traffic

### 2.6 Reporting is mixed into transactional paths

The app currently computes stats and filtered results directly from base tables. That is okay early on, but reporting workloads should eventually be separated from transactional reads.

---

## 3. Optimization Priorities

### Priority A: Fix high-impact inefficiencies first

These changes should be done first because they improve performance quickly without a large rewrite:

1. Move heavy reads to server-side handlers or server components.
2. Replace JS-side aggregation with SQL-side aggregation.
3. Add missing DB indexes for filters, sorting, and search.
4. Limit realtime subscriptions to only the pages that truly need them.
5. Remove N+1 patterns such as per-user admin lookups.

### Priority B: Improve scalability boundaries

After the first pass:

1. Introduce RPC functions for hot paths.
2. Add cache layers for stable reads.
3. Move exports and expensive jobs out of request-response paths.
4. Separate reporting queries from operational queries.

### Priority C: Improve reliability and operations

1. Add error monitoring and structured logs.
2. Add rate limiting and idempotency for sensitive actions.
3. Add query profiling and dashboarding.
4. Add safe retry patterns for external integrations.

---

## 4. Recommended Architecture Direction

### 4.1 Move read-heavy flows to server-side boundaries

Recommended pattern:

- Public/user/admin pages call:
  - Server Components
  - Next.js Route Handlers
  - Supabase RPC functions

instead of directly querying from the browser for everything.

#### Why

- Better control over caching
- Smaller client bundles
- Better security boundaries
- Easier batching
- Less duplicate network chatter

#### Good candidates

- inventory listing
- filter options
- order listing
- user directory data
- stats/reporting

#### Suggested rule

- Keep browser-side Supabase only for:
  - auth session state
  - minimal user-personalized live updates
  - small optimistic interactions

Everything else should trend toward server-owned query boundaries.

---

## 5. Database Query Optimizations

### 5.1 Replace JS aggregation with SQL/RPC aggregation

Current examples in `src/lib/supabase/queries/stats.ts` fetch rows and compute totals in JavaScript.

This should be replaced by:

- SQL views
- Postgres functions
- Supabase RPCs

#### Example target

- `get_inventory_stats()`
- `get_order_stats()`
- `get_report_summary(filters jsonb)`

These should return:

- counts
- sums
- grouped metrics

directly from Postgres.

#### Benefit

- less data transfer
- lower latency
- much better scaling as row counts increase

### 5.2 Replace `fetchFilterOptions()` full-table scans

Current behavior:

- load all `brand` and `storage` values
- dedupe in JavaScript

Recommended:

- use SQL `select distinct`
- or maintain lightweight lookup tables/materialized views

Examples:

- `inventory_brands`
- `inventory_storage_options`

If inventory changes often, a materialized view or trigger-maintained lookup table will be better than repeatedly scanning the full inventory table from the browser.

### 5.3 Reduce exact counts

Current paginated queries often use:

- `count: "exact"`

Recommended alternatives:

1. For admin tables:
   - use exact counts only where truly needed
2. For large datasets:
   - use cursor pagination
   - or lazy count loading
   - or approximate counts

#### Suggested rule

- Use exact count for small/critical admin screens only.
- Use cursor-based pagination for large operational tables like orders/inventory/users.

### 5.4 Improve search implementation

Current search relies on `ilike` and `.or(...)`.

This becomes slow on larger datasets.

Recommended:

1. Enable `pg_trgm`
2. Add trigram indexes for:
   - `inventory.device_name`
   - `user_profiles.first_name`
   - `user_profiles.last_name`
   - `user_profiles.business_name`
   - `user_profiles.business_email`
3. For more advanced search, use:
   - full-text search columns
   - `tsvector`

### 5.5 Add indexes for real filters and sorts

Based on current queries, likely valuable indexes include:

- `inventory(is_active, created_at desc, id desc)`
- `inventory(brand)`
- `inventory(grade)`
- `inventory(storage)`
- `inventory(quantity)`
- `inventory(selling_price)`
- `orders(user_id, created_at desc)`
- `orders(status, created_at desc)`
- `user_profiles(created_at desc)`
- `user_profiles(approval_status)`

If `created_at` and `id` are used together for stable ordering, index accordingly.

Before adding indexes blindly, validate with:

- `EXPLAIN ANALYZE`
- Supabase query insights
- slow query logs

---

## 6. Realtime Optimization

### 6.1 Scope subscriptions by page and need

Right now `RealtimeContext` subscribes globally.

Recommended:

1. Only subscribe on pages that need live updates.
2. Avoid global subscriptions in public/landing flows.
3. Subscribe to narrower event sets:
   - specific tables
   - specific users
   - specific rows if possible

### 6.2 Prefer invalidation events over full reactive coupling

Instead of having broad realtime update cascades:

- use realtime only to invalidate React Query caches
- then refetch only the minimal affected query

This keeps UX responsive while reducing unnecessary live churn.

### 6.3 Split public vs admin realtime

Admin dashboards often need realtime.
Public browsing usually does not.

Use different providers or mount points so public traffic does not inherit admin-grade websocket overhead.

---

## 7. API and Service Layer Improvements

### 7.1 Eliminate N+1 admin lookups

Current `app/api/users/emails/route.ts` fetches user emails one-by-one through auth admin calls.

Recommended options:

1. Mirror required email fields into `user_profiles`
2. Maintain a secure internal user directory table
3. Batch resolve users through a server-side cached map

Best long-term option:

- store the business-critical lookup fields you need in your own table
- do not depend on one admin API call per user during request handling

### 7.2 Centralize domain operations

Important operations should be handled by server-owned functions/services, not scattered across client code.

Examples:

- create order
- approve/reject order
- stock request creation/cancellation
- manual sale creation
- invoice generation

These flows should ideally become:

- route handler -> service layer -> RPC/DB transaction

This improves:

- consistency
- validation
- retries
- auditability

### 7.3 Add idempotency for write actions

Critical actions like order creation and approvals should be safe against:

- double clicks
- retries
- duplicate submissions

Recommended:

- idempotency keys
- unique constraints where appropriate
- transactional write functions in Postgres

---

## 8. Caching Strategy

### 8.1 Cache stable reads

Strong candidates for caching:

- filter options
- grades guide content
- report summaries
- user lists for short windows
- public inventory pages where strict real-time consistency is not required

Recommended mechanisms:

- Next.js server caching
- route-level revalidation
- React Query stale times
- tag-based invalidation where applicable

### 8.2 Do not over-cache volatile writes

Avoid aggressive caching for:

- live orders
- carts
- user-specific waitlists

These should remain fresher and event-driven.

### 8.3 Cache expensive derived views

For reports and dashboards:

- use materialized views or summary tables
- refresh periodically or on targeted triggers

This is much better than recalculating large summaries repeatedly on every request.

---

## 9. Reliability Improvements

### 9.1 Add observability immediately

At minimum, add:

- structured server logs
- request IDs
- error tracking
- performance timings

Recommended tools:

- Sentry for Next.js errors
- Vercel observability
- Supabase logs/query insights

Track:

- slow queries
- API error rate
- auth failures
- order write failures
- websocket subscription failures

### 9.2 Add rate limiting

Protect:

- auth-related routes
- contact/report endpoints
- email lookup/admin routes
- order creation actions

This helps both reliability and abuse prevention.

### 9.3 Add retries carefully

Use retries only for safe operations:

- external email sends
- webhook deliveries
- non-transactional notifications

Do not blindly retry transactional writes unless they are idempotent.

### 9.4 Add background processing for heavy tasks

Move non-immediate work out of request-response paths:

- PDF generation
- email notifications
- report generation
- large exports

These can run through:

- Supabase Edge Functions
- background jobs
- queue workers

---

## 10. Scalability Model for the Next Phase

### Near-term model

- Next.js app
- Supabase Postgres
- server-side query boundaries
- targeted realtime
- indexed transactional tables

This is enough for a healthy SMB/medium-scale application if implemented well.

### Medium-term model

Add:

- RPCs for hot queries
- summary tables/materialized views
- async job processing
- better internal analytics/reporting model

### Larger-scale model

If traffic and data volume grow substantially:

- split operational and analytics workloads
- move complex reports to dedicated reporting views/tables
- consider queue-backed workflows for order/invoice/notification pipelines

---

## 11. Proposed Phased Roadmap

### Phase 1: Immediate wins

1. Move filter options, stats, and large list reads behind server handlers/RPCs.
2. Add missing indexes for inventory/orders/users.
3. Reduce exact-count pagination where possible.
4. Scope realtime subscriptions to only needed pages.
5. Replace N+1 email lookup route with a batched/local table approach.
6. Add Sentry and structured API logging.

### Phase 2: Performance hardening

1. Convert aggregate/report queries to RPCs or SQL views.
2. Introduce materialized views for dashboard/reporting.
3. Add rate limiting and idempotency for critical writes.
4. Move exports and long-running tasks to async/background paths.

### Phase 3: Scalability and reliability maturity

1. Build a dedicated service layer for business operations.
2. Add query budgets and performance monitoring.
3. Introduce a reporting model separate from base transactional reads.
4. Formalize SLIs/SLOs for API latency and failure rates.

---

## 12. Concrete Recommendations for This Codebase

If I were leading this project, I would do these first:

### First 5 backend improvements

1. Refactor `src/lib/supabase/queries/stats.ts` so all aggregates run in SQL, not JavaScript.
2. Refactor `src/lib/supabase/queries/inventory.ts` so `fetchFilterOptions()` does not scan and dedupe the full table in the browser.
3. Refactor `app/api/users/emails/route.ts` to stop calling `getUserById()` in a loop.
4. Limit `src/contexts/RealtimeContext.tsx` subscriptions to admin pages or pages that truly need live updates.
5. Move high-value list reads from browser clients into server-owned query boundaries with caching.

### Next 5 backend improvements

1. Introduce cursor pagination for large tables.
2. Add search indexes for `ilike`-heavy fields.
3. Add background jobs for PDF/report/email tasks.
4. Add rate limiting and idempotency for writes.
5. Add observability around slow queries and route failures.

---

## 13. Definition of Success

This backend effort is successful when:

- initial page and data load times are consistently lower
- query counts per page drop materially
- admin/report pages do not degrade as table sizes grow
- websocket usage is narrower and more intentional
- production issues are easier to detect and debug
- critical writes are safe, traceable, and resilient

---

## 14. Final Recommendation

The best strategic move for this project is not a full backend rewrite.

The right move is:

- keep Next.js + Supabase
- move expensive reads and business logic to better server-side boundaries
- let Postgres do more of the heavy lifting
- reduce client-side over-fetching
- add operational guardrails

That will give you the biggest performance and scalability gains for the least architectural risk.

