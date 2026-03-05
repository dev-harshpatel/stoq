## Stoq / b2bMobiles Security Review

This document summarizes the **main security risks** identified in the codebase and gives **concrete remediation steps**. Focus areas:

- How attackers could abuse public API routes and Supabase RLS bypasses.
- Where we expose more data than necessary in responses / network tab.
- How environment and Supabase configuration affect security.

---

## 1. Admin API Routes (Service Role) Without Auth

**Files**

- `app/api/user-profile/create/route.ts`
- `app/api/user-profile/update-approval-status/route.ts`
- `app/api/users/delete/route.ts`
- `app/api/users/emails/route.ts`
- `app/api/auth/check-email/route.ts`

**Issue**

All of these routes:

- Are callable anonymously (no session or role checks).
- Use `supabaseAdmin`, which is created with the **service_role** key and bypasses all RLS.

**Why this is dangerous**

Any script or browser can:

- **Create or modify user profiles** (including `role` and `approval_status`) via `user-profile/create` and `user-profile/update-approval-status`.
- **Delete arbitrary users** via `users/delete`.
- **Fetch real user emails** via `users/emails`.
- **Enumerate which emails are registered** via `auth/check-email`.

In effect, these endpoints turn the service role into a public admin API.

### How to fix

**Step 1: Require an authenticated Supabase user (admin for admin-only routes)**

In each route that calls `supabaseAdmin`, read the current user using the server Supabase client and cookies.

Status:

- `app/api/user-profile/create/route.ts`:
  - **Requires an authenticated user** (via `createClient().auth.getUser()`).
  - Uses the authenticated user’s ID for `user_id` when upserting a profile, ignoring any mismatched `userId` sent in the body.
- `app/api/user-profile/update-approval-status/route.ts`, `app/api/users/delete/route.ts`, `app/api/users/emails/route.ts`:
  - **Require an authenticated admin** via the shared `ensureAdmin` helper in `src/lib/supabase/admin-auth.ts`.

```ts
// Example helper (pseudo-code)
import { createClient } from "@/lib/supabase/client/server";

async function requireAuthAndAdmin(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (error || !profile || (profile as { role: string }).role !== "admin") {
    return { errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase, user };
}
```

Then use this in each admin route:

```ts
export async function POST(request: NextRequest) {
  const auth = await requireAuthAndAdmin(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  // safe to call supabaseAdmin here
}
```

**Step 2: Treat `users/emails` as admin-only**

- Keep the endpoint, but only allow admins (same helper as above).
- If it is only used by server-side code, consider moving the logic out of `/app/api` and into a server-only module instead of a public HTTP endpoint.

**Step 3: Soften `auth/check-email`**

`auth/check-email` returns a boolean `{ exists }`. To avoid easy account enumeration:

- Keep the endpoint but:
  - Add rate limiting at the edge/load balancer level.
  - Optionally gate behind a CAPTCHA if abused.
- In the UI, avoid telling the user “email not found”; instead say “If an account exists for this email, we’ll send a message.”

---

## 2. Over-Broad `select("*")` and Data Exposure

### 2.1 Inventory queries expose cost and margin data

**Files**

- `src/lib/supabase/queries/inventory.ts`
  - `fetchPaginatedInventory` – `.select("*", { count: "exact" })`
  - `fetchAllFilteredInventory` – `.select("*")`
  - `fetchInventoryByIds` – `.select("*")`
- `src/contexts/InventoryContext.tsx`
  - `loadInventory` – `.select("*")`

**Issue**

These queries fetch **all inventory columns** for public or semi-public views. Combined with the RLS policy:

```sql
CREATE POLICY "Public can read inventory"
ON inventory FOR SELECT
TO public
USING (true);
```

unauthenticated visitors can see every column that the table exposes (including internal pricing such as `purchase_price`, `price_per_unit`, `hst`, etc.) by inspecting the network tab.

### How to fix

**Step 1: Replace `select("*")` with explicit field lists for public views**

For example:

```ts
// Public browsing
const PUBLIC_INVENTORY_FIELDS =
  "id, device_name, brand, grade, storage, quantity, selling_price, is_active";

// fetchPaginatedInventory
let query = supabase
  .from("inventory")
  .select(PUBLIC_INVENTORY_FIELDS, { count: "exact" })
  .order("created_at", INVENTORY_SORT_ORDER.created_at)
  .order("id", INVENTORY_SORT_ORDER.id);

// fetchAllFilteredInventory
let query = supabase
  .from("inventory")
  .select(PUBLIC_INVENTORY_FIELDS)
  .order("created_at", INVENTORY_SORT_ORDER.created_at)
  .order("id", INVENTORY_SORT_ORDER.id);
```

**Step 2: Use a dedicated admin view if needed**

If admins truly need to see internal pricing:

- Create a separate admin-only route or table/view (e.g. `inventory_admin_view`) that:
  - Requires admin auth.
  - Can expose `purchase_price`, `price_per_unit`, etc.

---

### 2.2 `product_uploads` logs via `select("*")`

**File**

- `src/contexts/InventoryContext.tsx` → `getUploadHistory`:

```ts
const { data, error } = await (supabase.from("product_uploads") as any)
  .select("*")
  .order("created_at", { ascending: false });
```

**Issue**

- Depending on schema, `product_uploads` may contain:
  - Internal error messages.
  - Internal user IDs.
  - Details about batch operations.
- If RLS is not restricted to admins, non-admin users could access operational details they should not see.

### How to fix

- Confirm that `product_uploads` has **RLS enabled** and only admins can read it.
- Replace `select("*")` with just the columns you need for the UI, e.g.:

```ts
.select(
  "id, uploaded_by, file_name, total_products, successful_inserts, failed_inserts, upload_status, error_message, created_at, updated_at"
)
```

---

## 3. Service Role Key Handling & Environment Hygiene

**File**

- `src/lib/supabase/client/admin.ts`

**Issue**

- The `SUPABASE_SERVICE_ROLE_KEY` is used correctly (server-only), but if it is ever leaked (committed to git, exposed as a public env var, or logged), an attacker can:
  - Call Supabase directly with full privileges, ignoring all RLS policies.

### How to fix / keep safe

- Ensure:
  - `.env`, `.env.local`, and environment secrets are **git-ignored** and never committed.
  - Prod and dev use **different** sets of keys.
- If there is any chance a key was exposed:
  - Rotate the database password and regenerate anon + service_role keys in the Supabase dashboard.
  - Update all Vercel / deployment environment variables accordingly.

---

## 4. RLS Model & Admin Bypass

**File**

- `supabase/migrations/002_rls_policies.sql`

**Good**

- `user_profiles`, `inventory`, and `orders` have RLS enabled.
- Policies restrict:
  - Users to their own profile and orders.
  - Inventory modifications to admins only.

**Risk**

- Any code path that uses the service-role client (`supabaseAdmin`) **completely bypasses RLS**.
- If those code paths are not strongly authenticated and authorized (see section 1), RLS no longer protects you.

### How to fix

- Re-audit any place using `supabaseAdmin`:
  - Ensure each call is behind:
    - A verified Supabase session, **and**
    - An explicit admin role check in `user_profiles`.
- Prefer using the anon client with RLS where possible; use `supabaseAdmin` only for:
  - Background jobs.
  - One-off admin operations behind a secure UI or admin-only API.

---

## 5. Email Enumeration & Privacy

### 5.1 `auth/check-email`

**File**

- `app/api/auth/check-email/route.ts`

**Issue**

- Returns `{ exists: true | false }` for any email.
- Attackers can determine which addresses are registered, aiding phishing and credential stuffing.

### How to fix

- Keep the functionality but mitigate:
  - Add rate limiting (per-IP or per-session) at the infrastructure level (Supabase / edge / CDN).
  - Optionally, add a CAPTCHA for repeated failed checks.
  - In the UI, prefer wording that does not reveal whether an email is registered (e.g. “If an account exists for this email, we’ll send you a reset link.”) unless you explicitly accept the small enumeration risk.

### 5.2 `users/emails`

**File**

- `app/api/users/emails/route.ts`

**Issue**

- Given an array of user IDs, returns a map of user IDs → emails.
- If reachable by non-admins, this is direct exposure of customer emails.

### How to fix

- Restrict this endpoint strictly to admins (see section 1).
  - **Implemented**: `app/api/users/emails/route.ts` now calls `ensureAdmin` before using `supabaseAdmin`.
- If only server code needs this mapping, consider:
  - Removing the API route and performing the lookups directly via `supabaseAdmin` from server-side code.

---

## 6. Operational Recommendations

### 6.1 Always use HTTPS in production

- Ensure your production domain (e.g. `b2bmobiles.ca`) enforces HTTPS so:
  - Passwords, reset tokens, and profile data cannot be sniffed.

### 6.2 Logging & monitoring

- Log all admin actions server-side (using a structured logger), for example:
  - When a profile’s `approval_status` is changed.
  - When a user is deleted.
- Periodically review:
  - Supabase **Auth Logs** for anomalies.
  - Supabase **Database Logs** for suspicious admin operations.

### 6.3 Reduce attack surface in the network tab

- Avoid including values in API responses that the frontend does not need.
- Use mapping functions (e.g. `dbRowToInventoryItem`) to return **view models** instead of raw table rows.
- Prefer small, purpose-built endpoints over “give me everything” style responses.

---

## 7. Summary Checklist

Use this as a quick hardening checklist:

- [x] Add **auth + admin role checks** to all routes using `supabaseAdmin`.
- [x] Replace `select("*")` with explicit column lists, especially for:
  - Inventory queries.
  - Log/auxiliary tables like `product_uploads`.
- [ ] Ensure **RLS is enabled** and correct on all sensitive tables.
- [ ] Protect `auth/check-email` from brute-force enumeration (rate limit, optional CAPTCHA).
- [ ] Keep `SUPABASE_SERVICE_ROLE_KEY` and DB credentials secret; rotate if there’s any doubt.
- [ ] Enforce HTTPS in production; validate Supabase **Site URL** and **Redirect URLs** per environment.
- [ ] Add logging around all admin actions (approvals, deletions, bulk operations).

Addressing these items will significantly reduce the most realistic attack paths against this application while keeping the existing architecture (Supabase + Next.js) intact.

