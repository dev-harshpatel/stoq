# Code Audit: Reusability Gaps & Optimization Opportunities

---

## 1. Duplicated Code (High Priority)

### 1a. `getStatusColor` / `getStatusLabel` — Copied in 4 Files

The exact same two switch statements exist in:
- `src/page-components/Orders.tsx` (lines 28–56)
- `src/components/OrderDetailsModal.tsx` (lines 41–69)
- `src/components/UserOrders.tsx` (lines 11–39)
- `app/user/orders/page.tsx` (lines 30–58)

A similar variant for `ApprovalStatus` also exists in `src/components/UsersTable.tsx` (lines 14–25).

**Fix:** Create `src/lib/statusUtils.ts` exporting shared `getOrderStatusColor()` and `getOrderStatusLabel()`.

---

### 1b. Filter Reset + Page Clamp — Copied in 5 Files

This exact two-`useEffect` block is copy-pasted in every paginated page:

```ts
// Reset to page 1 when filters change
const filtersKey = JSON.stringify(serverFilters);
const prevFiltersRef = useRef(filtersKey);
useEffect(() => { ... }, [filtersKey, setCurrentPage]);

// Clamp page if it exceeds totalPages
useEffect(() => { ... }, [currentPage, totalPages, isLoading, setCurrentPage]);
```

Present in: `Inventory.tsx`, `ProductManagement.tsx`, `UserProducts.tsx`, `Orders.tsx`, `app/user/orders/page.tsx`.

**Fix:** Absorb both effects into the `usePaginatedReactQuery` hook or create a `useFilteredPagination` wrapper.

---

### 1c. `defaultFilters` Object — Defined 3 Times

Identical object in `Inventory.tsx`, `ProductManagement.tsx`, `UserProducts.tsx`.

**Fix:** Export `defaultFilters` from `FilterBar.tsx` alongside the `FilterValues` type.

---

### 1d. `FilterValues` and `InventoryFilters` Are Identical Types

`FilterBar.tsx` exports `FilterValues`, `queries.ts` exports `InventoryFilters` — same fields, same types. Three pages manually map one to the other.

**Fix:** `export type InventoryFilters = FilterValues` in queries.ts, or use a single type.

---

### 1e. `serverFilters` Construction — Repeated 3 Times

All three inventory pages build the same `serverFilters` object from `debouncedSearch` + `filters.*`.

**Fix:** Create a helper `buildInventoryFilters(debouncedSearch, filters)` or eliminate by merging the types.

---

### 1f. `fetchFilterOptions` Called 3 Times — No Caching

Each inventory page calls `fetchFilterOptions().then(setFilterOptions)` on mount independently. Three pages = three API calls for the same brand/storage dropdown data.

**Fix:** Use a React Query `useQuery` with a `filterOptions` key so it's fetched once and shared.

---

### 1g. Mobile/iOS Detection + Download Blob Logic — Duplicated

`src/lib/exportUtils.ts` (lines 85–120) and `src/lib/invoicePdfUtils.tsx` (lines 102–148) have identical user-agent regex patterns and blob download logic.

**Fix:** Extract to a shared `src/lib/downloadUtils.ts`.

---

### 1h. Order Rejection Notes UI — Duplicated in 2 Files

The rejection reason + comment display block is copy-pasted between `Orders.tsx` (lines 327–351) and `app/user/orders/page.tsx` (lines 288–303).

**Fix:** Create a `<RejectionNote reason={...} comment={...} />` component.

---

### 1i. Order Table Row — Near-Identical in 2 Files

The order row structure in `Orders.tsx` (lines 276–363) and `app/user/orders/page.tsx` (lines 229–319) is nearly identical. The user page just drops the Customer column.

**Fix:** Create a shared `<OrderTableRow>` component.

---

### 1j. Sticky Header/Pagination Footer Layout — Repeated in 4+ Pages

Every paginated page uses this three-zone layout pattern (sticky header, scrollable body, sticky pagination footer) with identical Tailwind classes.

**Fix:** Create a `<PaginatedPageLayout header={...} footer={...}>` wrapper.

---

### 1k. `PAGE_SIZE = 10` — Defined Twice

Both `use-paginated-query.ts` and `use-paginated-react-query.ts` export their own `PAGE_SIZE`.

**Fix:** Keep it in one place and import from there.

---

### 1l. Subtotal Calculation — Duplicated Within `OrdersContext.tsx`

`buildOrderInsert` (lines 92–108) and `createOrder` fallback (lines 236–247) both calculate subtotal with the same reduce logic.

**Fix:** Extract to a helper function.

---

### 1m. Product Insert Payload — Duplicated Within `InventoryContext.tsx`

`bulkInsertProducts` builds the same 12-field insert object in two places (batch path and individual fallback).

**Fix:** Extract to a `productToInsertRow()` helper.

---

## 2. Reusable Components That Exist But Aren't Used

| Component | Exists At | Not Used In |
|-----------|-----------|-------------|
| `<Loader>` | `src/components/Loader.tsx` | `Orders.tsx` (lines 161–168), `app/user/orders/page.tsx` (lines 114–123) — both use custom Package+animate-pulse instead |
| `<EmptyState>` | `src/components/EmptyState.tsx` | `ProductManagement.tsx` (line 534), `Alerts.tsx` (line 159), `Dashboard.tsx` (lines 238, 278) — all use custom inline empty states |
| `<TableSkeleton>` | `src/components/TableSkeleton.tsx` | Never imported anywhere. `ProductManagement.tsx` defines its own 82-line inline skeleton instead |
| `<GradeBadge>` | `src/components/GradeBadge.tsx` | `OrderDetailsModal.tsx` (line 382) renders grade as plain Badge instead |
| `<StatusBadge>` | `src/components/StatusBadge.tsx` | `InventoryTable.tsx` mobile section (lines 182–194) re-implements quantity coloring inline |

---

## 3. Dead Code — Unused Exports & Components

### Components Never Imported Anywhere
| File | Status |
|------|--------|
| `src/components/Footer.tsx` | Orphaned (commented-out import in AppLayout) |
| `src/components/PriceChangeIndicator.tsx` | Zero imports in entire codebase |
| `src/components/TableSkeleton.tsx` | Zero imports in entire codebase |
| `src/components/UserOrders.tsx` | Replaced by inline `app/user/orders/page.tsx`, never cleaned up |

### Functions Never Imported
| Export | File |
|--------|------|
| `getOntarioTime` | `src/lib/utils.ts` |
| `isAdmin` | `src/lib/supabase/utils.ts` |
| `isCurrentUserAdmin` | `src/lib/supabase/utils.ts` |
| `updateUserRole` | `src/lib/supabase/utils.ts` |
| `getUserProfileWithDetails` | `src/lib/supabase/utils.ts` |
| `getAllUserProfiles` | `src/lib/supabase/utils.ts` |
| `inventoryData` (sample array) | `src/data/inventory.ts` |

### Other
| Item | Note |
|------|------|
| `src/lib/constants.ts` | Empty file, nothing exported |
| `toInventoryUpdate` in `InventoryContext.tsx` | Only used internally, shouldn't be exported |

---

## 4. Bugs Found During Audit

### 4a. `calculateDueDate` Is a No-Op
`src/lib/invoiceUtils.ts` (lines 71–81): All code branches return `invoiceDate` unchanged. The function does nothing regardless of input. It's called from the invoice page at lines 151, 229, 306.

### 4b. `formatPrice` Bypassed in Mobile Cards
`src/components/InventoryTable.tsx` mobile section (lines 203, 220): Uses raw `$${item.purchasePrice}` instead of `formatPrice()`, skipping `toLocaleString()` and the ` CAD` suffix. Desktop version correctly uses `formatPrice()`.

### 4c. "Apply Filters" Button Has No Handler
`src/components/FilterBar.tsx` (line 150): Renders a button with no `onClick`. Filters already apply on change, so the button is misleading.

---

## 5. Performance Concerns

### 5a. Full-Table Context Loads (Scalability Blocker)

`InventoryContext` loads the **entire inventory table** into memory on mount. `OrdersContext` does the same for orders. Both are consumed by Dashboard and Reports for stats.

At scale (thousands of items), this will:
- Slow down initial page load
- Waste memory
- Cause unnecessary re-renders everywhere the context is consumed

**Fix (future):** Replace context-based aggregation with dedicated Supabase aggregate queries for Dashboard/Reports stats. Keep contexts only for mutations.

### 5b. `UserOrders.tsx` Triggers Full Orders Load for All Users

`src/components/UserOrders.tsx` calls `getUserOrders(user.id)` which filters the full `orders` array in memory. This means even a regular user viewing their 5 orders causes ALL orders for ALL users to be loaded. The paginated `fetchPaginatedUserOrders` query already exists but isn't used here.

### 5c. `getUserOrders` Not Memoized — Defeats `useMemo` in Stats Page

`OrdersContext` recreates `getUserOrders` on every render (no `useCallback`). `app/user/stats/page.tsx` puts it in a `useMemo` dependency array, making the memo useless — it recalculates every render.

Same issue with `loadInventory`, `updateProduct`, `decreaseQuantity`, `bulkInsertProducts` in `InventoryContext` — none are wrapped in `useCallback`.

### 5d. Wishlist Page Consumes 6 Contexts

`app/user/wishlist/page.tsx` imports `useInventory()`, `useOrders()`, `useCart()`, `useWishlist()`, `useUserProfile()`, and `useAuth()`. The full `inventory` array is pulled in just for `.find()` lookups on wishlist item IDs. A targeted query for just those items would be far lighter.

### 5e. `OrderDetailsModal` Re-Renders on Every Inventory Change

It imports `useInventory()` for stock checks. The modal is always mounted in the `Orders.tsx` tree even when closed, so every realtime inventory update triggers a re-render of a closed modal.

### 5f. Missing `React.memo` on Frequently Rendered Presentational Components

`StatCard`, `GradeBadge`, `StatusBadge`, `PaginationControls` are pure presentational components rendered per-row or multiple times. None use `React.memo`.

---

## 6. Hardcoded Values That Should Be Constants

| Value | Occurrences | Should Be |
|-------|-------------|-----------|
| `"America/Toronto"` | 6 places across 4 files | `ONTARIO_TIMEZONE` constant |
| `"HARI OM TRADERS LTD."` + address | Duplicated in `invoicePdfUtils.tsx` + `Settings.tsx` | Company config constant |
| `300` (debounce ms) | Every search input | `SEARCH_DEBOUNCE_MS` |
| `200` (blob cleanup timeout) | `exportUtils.ts` + `invoicePdfUtils.tsx` | Shared constant |
| `50` (batch size) | `InventoryContext.tsx` | `BULK_INSERT_BATCH_SIZE` |
| `['EMT', 'WIRE', 'CHQ']` | `invoiceUtils.ts` + `invoice/page.tsx` | `PAYMENT_METHODS` constant |
| Sort order `created_at asc, id asc` | 3 places for inventory queries | Named constant |

---

## 7. Inconsistencies

### 7a. Two Toast Systems Active
- `shadcn/use-toast`: Used in `upload-products`, `wishlist`, `Settings`
- `sonner`: Used in `contact`, `profile`, `SignupModal`, `ProductManagement`

Both are active simultaneously. Should standardize on one.

### 7b. Page Implementation Pattern
- **Admin pages** (dashboard, inventory, orders, products, reports, settings, alerts): Thin `page.tsx` wrapper → `page-components/*.tsx`
- **User pages** (orders, wishlist, profile, stats, grades) + `admin/users` + `admin/upload-products`: Full 200–600 line implementations inline in `page.tsx`

Should follow a consistent pattern.

### 7c. `formatPrice` Lives in Data File
`formatPrice` is defined in `src/data/inventory.ts` (a sample data file) but imported by 14+ files across the app. It belongs in `src/lib/utils.ts` or `src/lib/formatters.ts`.

---

## Priority Summary

| Priority | What | Impact |
|----------|------|--------|
| **High** | Extract `getStatusColor`/`getStatusLabel` to shared util | 4 files de-duplicated |
| **High** | Absorb filter-reset + page-clamp into pagination hook | 5 files de-duplicated |
| **High** | Cache `fetchFilterOptions` with React Query | 3 redundant API calls eliminated |
| **High** | Fix `calculateDueDate` bug (no-op function) | Invoice due dates actually work |
| **High** | Fix `formatPrice` bypass in mobile cards | Consistent price display |
| **Medium** | Export `defaultFilters` from FilterBar | 3 files de-duplicated |
| **Medium** | Merge `FilterValues`/`InventoryFilters` types | Eliminate manual mapping |
| **Medium** | Use `<Loader>` and `<EmptyState>` everywhere | Consistent UX |
| **Medium** | Standardize on one toast library | Consistent notifications |
| **Medium** | Delete dead components (Footer, PriceChangeIndicator, TableSkeleton, UserOrders) | Cleaner codebase |
| **Medium** | Delete dead utils (getOntarioTime, isAdmin, etc.) | Cleaner codebase |
| **Medium** | Wrap context functions in `useCallback` | Fix broken memoization |
| **Low** | Extract shared page layout wrapper | 4+ files simplified |
| **Low** | Extract rejection notes component | 2 files de-duplicated |
| **Low** | Extract download blob logic to shared util | 2 files de-duplicated |
| **Low** | Centralize hardcoded constants | Better maintainability |
| **Low** | Add `React.memo` to presentational components | Minor perf improvement |
| **Future** | Replace full-table context loads with aggregate queries | Major scalability improvement |
