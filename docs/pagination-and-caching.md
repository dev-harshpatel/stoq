# Pagination & Caching — Current State and Recommendations

## How Pagination Works Right Now

### The Hook: `usePaginatedQuery`

We have a custom hook (`src/hooks/use-paginated-query.ts`) that every list page uses — Inventory, Orders, Users, Product Management.

**How it works:**

1. Page size is **10 items** by default.
2. When you go to page 3, it calculates: `from = 20, to = 29` and calls Supabase with `.range(20, 29)`.
3. Supabase returns those 10 rows + a total count (using `{ count: "exact" }`).
4. The UI shows numbered page buttons with Previous/Next.

**Smart things it already does:**
- Resets to page 1 automatically when you change filters or search.
- Protects against race conditions (if you click page 2 then quickly page 3, only page 3's result is used).
- Auto-clamps the page number if items get deleted (e.g., you're on page 5 but now there are only 4 pages → jumps to page 4).
- Silently refetches when a realtime event fires (no loading spinner).
- Refetches when you come back to the tab (catches any missed realtime events).

### Does Supabase Support Pagination?

**Yes.** Supabase has built-in pagination via `.range(from, to)`. We're already using it correctly. Supabase also returns `count` when you pass `{ count: "exact" }` in the select, which gives us total items for calculating page numbers.

---

## How Caching Works Right Now

### The Problem: No Page-Level Cache

**Currently, every single page navigation makes a fresh API call.** Here's what happens:

1. You're on page 1 → API call fetches items 1-10. ✅
2. You click page 2 → API call fetches items 11-20. ✅
3. You go back to page 1 → **API call fetches items 1-10 again.** ❌

This is wasteful. Page 1 data was already fetched seconds ago and nothing changed. We're making unnecessary network requests.

### What IS Cached (Context-Level)

The app does have some caching, but not for paginated data:

| What | Where | How |
|------|-------|-----|
| Full inventory list | `InventoryContext` | Loads ALL items into memory on mount. Used for things like the cart, not for the paginated table. |
| Full orders list | `OrdersContext` | Same pattern — all orders in memory. |
| Cart items | `CartContext` | Dual: localStorage + database sync. Merges on login. |
| Tax rates | `taxUtils.ts` | In-memory Map with 5-minute TTL. |
| Filter options (brands, storage) | `Inventory.tsx` | Fetched once on mount, stored in local state. |

### What's NOT Cached

- **Paginated page data** — every page change = new API call.
- **Previously visited pages** — going back refetches everything.
- **Search results** — same search typed twice = two API calls.

### React Query is Installed But Unused

`@tanstack/react-query` is in `package.json` and the `QueryClientProvider` is set up in `Providers.tsx`, but **no actual queries use it**. It's just a wrapper doing nothing.

---

## The Ideal Approach

The right behavior should be:

1. Page 1 loads → fetch from API, cache the result.
2. Page 2 loads → fetch from API, cache the result.
3. Go back to page 1 → **serve from cache instantly** (no API call).
4. Something changes (realtime event, manual refresh) → invalidate the cache, refetch.

This is exactly what **React Query (TanStack Query)** was built for. Since it's already installed, we just need to actually use it.

### What React Query Would Give Us

| Feature | What It Does |
|---------|-------------|
| **Automatic caching** | Each page's data is cached by a unique key like `["inventory", page, filters]`. Revisiting a page = instant. |
| **Background refetching** | Shows cached data immediately, then silently checks if it's stale. UI never feels slow. |
| **staleTime** | "Consider data fresh for X seconds." During this time, no refetch at all — even on page revisit. |
| **Cache invalidation** | On a realtime event, call `queryClient.invalidateQueries(["inventory"])` → all pages refetch in background. |
| **Garbage collection** | Unused cache entries are automatically cleaned up after a configurable time (default 5 min). |
| **Retry logic** | Failed requests auto-retry (configurable). |
| **DevTools** | Visual panel showing all cached queries, their state, and timing. Great for debugging. |

### Example: How It Would Look

```ts
// Instead of our custom usePaginatedQuery, each page would do:
const { data, isLoading, isFetching } = useQuery({
  queryKey: ["inventory", currentPage, filters],
  queryFn: () => fetchPaginatedInventory(filters, { from, to }),
  staleTime: 30_000, // 30 seconds — don't refetch if data is younger than this
});

// On realtime event:
queryClient.invalidateQueries({ queryKey: ["inventory"] }); // invalidates ALL inventory pages
```

---

## Other Observations

### Double Data Loading

Right now we have **two parallel systems** for inventory:

1. `InventoryContext` loads the **entire inventory table** into memory (for cart lookups, etc.)
2. `usePaginatedQuery` fetches **per-page slices** from the same table.

This means on the inventory page, we're fetching data twice — the full table AND the paginated slice. With React Query, we could potentially unify this.

### No URL State for Pagination

The current page number isn't stored in the URL (no `?page=2`). This means:
- You can't bookmark or share a specific page.
- Browser back button doesn't go to the previous page.
- Refreshing always starts at page 1.

This is a separate decision but worth noting.

---

## Summary of Decisions to Make

1. **Should we migrate `usePaginatedQuery` to use React Query?**
   - Gives us page caching, background refetching, retry, devtools.
   - React Query is already installed, just unused.

2. **What `staleTime` makes sense?**
   - 30 seconds? 1 minute? Since we have realtime events, even a longer staleTime is safe — realtime will invalidate when data actually changes.

3. **Should we store page number in the URL?**
   - Enables bookmarking, back button, and link sharing.
   - Minor change, but changes UX behavior.

4. **Should we remove/reduce the full-table context loads?**
   - `InventoryContext` loads everything. At scale (thousands of items), this is heavy.
   - Could be replaced with targeted queries (e.g., fetch specific items for cart by ID).
