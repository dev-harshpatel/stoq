# Price Refresh & Data Sync Optimization Analysis

## Executive Summary

This document analyzes the current auto-refresh implementation, identifies scalability and cost issues, and proposes optimization strategies—including WebSockets vs. alternatives—to minimize database load while maintaining a good user experience.

---

## 1. Current Architecture Overview

### 1.1 Data Flow

```
User toggles Auto-Refresh ON
        ↓
useAutoRefresh (every 2 mins) → triggerRefresh()
        ↓
RefreshContext: refreshKey++
        ↓
All consumers re-fetch:
  - InventoryContext: loadInventory() [FULL table]
  - usePaginatedQuery (Inventory, UserProducts, Orders): fetchData()
```

### 1.2 Current Implementation Components

| Component | Location | Triggers on refreshKey | Data Fetched | DB Calls |
|-----------|----------|------------------------|--------------|----------|
| InventoryContext | Global (always mounted) | Yes | Full inventory table | 1 × SELECT * |
| Inventory page | Admin | Yes | Paginated (10 items) | 1 × SELECT * with range |
| UserProducts | User | Yes | Paginated (10 items) | 1 × SELECT * with range |
| Orders page | Admin | Yes | Paginated orders | 1 × SELECT * |
| ProductManagement | Admin | No (uses Realtime) | Paginated | Realtime only |

### 1.3 Existing Realtime Subscriptions (Already Implemented!)

| Context | Table | Event | Behavior |
|---------|-------|-------|----------|
| InventoryContext | `inventory` | `*` (all changes) | Reloads full inventory on any change |
| OrdersContext | `orders` | `*` (all changes) | Reloads all orders on any change |

**Important**: Supabase Realtime is already in use for `inventory` and `orders`. When data changes in the database, clients receive push events and refetch. The auto-refresh toggle adds **redundant** polling on top of this.

---

## 2. Current Problems

### 2.1 Database Load (Critical)

**Scenario**: 1000 concurrent users with auto-refresh ON for 1 hour

| Metric | Calculation | Result |
|--------|-------------|--------|
| Refresh cycles per user | 60 min ÷ 2 min | 30 cycles |
| InventoryContext fetches per cycle | 1 (full table) | 30 |
| Page-specific fetches per cycle | 1 (paginated) | 30 |
| **Total DB calls per user per hour** | 30 × 2 | **60** |
| **Total per 1000 users** | 60 × 1000 | **60,000** |

**Additional issues**:
- **InventoryContext** fetches the **entire** inventory table on every refresh, even when the user only views a paginated page (10 items).
- **Redundant with Realtime**: Realtime already pushes changes. Polling every 2 min is redundant when data changes are infrequent.
- **No visibility check**: If the user switches tabs or minimizes the browser, the interval still runs and triggers requests.

### 2.2 Cost Implications

- **Supabase**: Billing is based on database usage (rows read, API calls). 60K+ requests/hour for 1000 users = high cost.
- **Vercel/Serverless**: Each request may incur cold starts and compute time.
- **Network**: Unnecessary bandwidth for unchanged data.

### 2.3 UX Issues

- **Toggle visibility**: Users may not discover the toggle; defaults matter.
- **Stale when OFF**: If auto-refresh is off, users rely on manual refresh or Realtime only.
- **Realtime + Polling overlap**: Both can cause duplicate refetches when data changes.

---

## 3. Do WebSockets Reduce Load?

### 3.1 Short Answer: Yes, But You Already Have Supabase Realtime

Supabase Realtime uses **WebSockets** under the hood. It subscribes to `postgres_changes` on the `inventory` and `orders` tables. When a row is inserted, updated, or deleted, the client receives an event and can refetch.

**Key insight**: Realtime = **push-based** (server pushes when data changes). Polling = **pull-based** (client asks every 2 min). Realtime is inherently more efficient when data changes are infrequent.

### 3.2 WebSockets vs. Polling (Current)

| Approach | DB Calls | When | Pros | Cons |
|----------|----------|------|------|------|
| **Polling (current)** | Every 2 min | Scheduled | Simple, predictable | High load, waste when no changes |
| **Realtime (Supabase)** | On change | Event-driven | Near-zero load when no changes | Connection overhead, requires Supabase |

### 3.3 Recommendation: Rely on Realtime, Remove Polling

For price/inventory updates:
- **Realtime is sufficient** when admins update prices; changes propagate immediately.
- **Remove or dramatically reduce** the auto-refresh polling.
- **Manual refresh** is enough for edge cases (e.g., user thinks data is stale).

---

## 4. Optimization Strategies

### 4.1 Strategy A: Remove Auto-Refresh Polling (Recommended)

**Action**: Remove the 2-minute interval entirely. Rely on Supabase Realtime + manual refresh.

**Implementation**:
1. Remove `useAutoRefresh` interval logic; keep only manual refresh.
2. Ensure all inventory/order views use Realtime (or listen to a shared context that does).
3. Keep the "Manual Refresh" button for user control.

**Pros**: 
- Near-zero DB load from auto-refresh.
- Realtime already handles change propagation.
- Simpler code.

**Cons**: 
- If Realtime is disconnected or fails, users must manually refresh.
- For edge cases (e.g., external price updates), manual refresh is required.

**Estimated DB load reduction**: ~95% reduction in refresh-related queries.

---

### 4.2 Strategy B: Visibility-Aware Polling (If Polling Must Stay)

**Action**: Only poll when the user is actively viewing the tab/window.

**Implementation**:
1. Use `document.visibilityState` and `visibilitychange` event.
2. When tab is hidden: clear the interval.
3. When tab is visible: resume interval (or do a single refresh on focus).

```typescript
// Example: visibility-aware
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      clearInterval(intervalRef.current);
    } else if (autoRefresh) {
      performRefresh();
      intervalRef.current = setInterval(performRefresh, intervalMs);
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [autoRefresh, intervalMs]);
```

**Pros**: Reduces load when users switch tabs or minimize.
**Cons**: Still poll when tab is visible; doesn't eliminate the load.

---

### 4.3 Strategy C: Extend Realtime to All Pages

**Current**:
- `InventoryContext`: Realtime on `inventory` → full table reload.
- `UserProducts`: Uses `usePaginatedQuery` with `refreshKey` only; **no Realtime**.
- `Inventory` page: Uses `usePaginatedQuery` with `refreshKey` only; **no Realtime** (realtime was removed to avoid "double-fetching").

**Action**:
1. Re-enable `realtimeTable: "inventory"` in `usePaginatedQuery` for UserProducts and Inventory pages.
2. Remove `refreshKey` from these pages for auto-refresh (keep for manual refresh only).
3. Let Realtime be the single source of truth for data changes.

**Pros**: 
- All views get live updates without polling.
- Fewer DB calls.

**Cons**: 
- Realtime may trigger multiple refetches if many rows change rapidly.
- Need to ensure Realtime and manual refresh don't conflict.

---

### 4.4 Strategy D: Server-Side Caching & Stale-While-Revalidate

**Concept**: Use a cache layer (e.g., Redis, Upstash) or Supabase edge functions to cache inventory data. Serve cached data instantly; revalidate in background.

**Implementation**:
1. Add an API route that fetches inventory with caching headers or a cache layer.
2. Client fetches from cache; cache invalidates on Realtime events or TTL.

**Pros**: Faster response, lower DB load.
**Cons**: Increased complexity; requires infra setup.

---

### 4.5 Strategy E: Consolidate InventoryContext and Paginated Queries

**Problem**: InventoryContext fetches full table on every refresh. Paginated pages use `fetchPaginatedInventory` separately. Both run when refreshKey changes.

**Action**:
1. **Option A**: Remove InventoryContext's full-table load for "refresh" purposes. Use it only for operations that need full inventory (e.g., bulk update, reset).

2. **Option B**: Make InventoryContext the single source of truth. Paginated pages read from InventoryContext instead of fetching. Pagination is client-side. (Only viable if inventory size is small < 1000–2000 items.)

3. **Option C**: Use Realtime only in `usePaginatedQuery`; remove InventoryContext's refreshKey dependency.

---

## 5. Recommended Implementation Plan

### Phase 1: Immediate (Low Effort)

1. **Disable auto-refresh by default** (already done: `AUTO_REFRESH_DEFAULT_ENABLED = false`).
2. **Add visibility-aware polling** if auto-refresh is kept: pause when tab is hidden.
3. **Reduce interval** if kept: e.g., 5 min instead of 2 min.

### Phase 2: Realtime-First (Medium Effort)

1. **Re-enable Realtime in `usePaginatedQuery`** for UserProducts and Inventory pages with `realtimeTable: "inventory"`.
2. **Remove refreshKey from auto-refresh flow** for inventory: only manual refresh triggers it.
3. **Remove or simplify Auto-Refresh toggle**: 
   - Option A: Remove entirely; rely on Realtime + manual refresh.
   - Option B: Keep but change behavior: "Auto-refresh" = "Realtime on" (no polling).

### Phase 3: Backend Optimization (Higher Effort)

1. **API route for inventory** with caching (e.g., Next.js `unstable_cache` or a Redis layer).
2. **Deduplicate** InventoryContext full fetch vs. paginated fetch—only fetch what the current view needs.

---

## 6. WebSockets vs. Supabase Realtime: Clarification

| Question | Answer |
|----------|--------|
| Does Supabase Realtime use WebSockets? | Yes. It uses WebSockets for real-time pub/sub. |
| Will custom WebSockets reduce load vs. current polling? | Yes. Push-based is always more efficient than polling. |
| Do you need custom WebSockets? | No. Supabase Realtime already provides this. |
| When would custom WebSockets help? | If you need to push events from a non-Supabase source (e.g., external price feed API). |

---

## 7. Code Reusability Recommendations

### 7.1 Shared Data Fetching

- **Centralize** inventory fetch logic in `queries.ts` (already done).
- **Single source of truth** for filters and pagination params.

### 7.2 Realtime Subscription Pattern

- Create a shared hook `useInventoryRealtime()` that subscribes to `inventory` changes and invokes a callback.
- Use it in both InventoryContext and usePaginatedQuery to avoid duplicate subscriptions.

### 7.3 Refresh Logic

- Separate "manual refresh" vs. "auto refresh" vs. "realtime refresh".
- Manual: user clicks button.
- Auto: deprecated or visibility-aware polling.
- Realtime: server push.

---

## 8. Summary

| Aspect | Current | Optimized |
|--------|---------|-----------|
| **Primary mechanism** | Polling every 2 min | Realtime (push) |
| **DB calls per user/hour** | ~60 (with auto-refresh) | ~0–5 (Realtime + manual) |
| **Scalability** | Poor (N × 30 per hour) | Good (event-driven) |
| **Cost** | High | Low |
| **UX** | Stale when toggle off | Always fresh with Realtime |

**Recommendation**: Remove auto-refresh polling; rely on Supabase Realtime + manual refresh. This is the most effective way to reduce database load while preserving UX. WebSockets are already in use via Supabase Realtime; no custom WebSocket implementation is needed.

---

## 9. Next Steps

1. Review this document and decide on Phase 1–3 scope.
2. Implement Phase 1 (visibility-aware + default disabled) if keeping auto-refresh.
3. Implement Phase 2 (Realtime-first) for UserProducts and Inventory.
4. Consider Phase 3 (caching) for higher scale later.

---

*Document generated for the Stoq project. Last updated: January 2026.*
