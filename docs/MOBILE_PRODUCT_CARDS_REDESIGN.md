# Mobile Product Cards Redesign — Implementation Plan

> **Status:** Implemented ✅

## Problem Statement

On mobile, only **2 product cards** fit on screen. Each card displays excessive information (Brand, Grade, Storage, Qty, Price, Updated timestamp, Status, Wishlist, Cart), resulting in poor information density and a suboptimal browsing experience.

**Goal:** Maximize products visible per screen while preserving quick access to full details and primary actions.

---

## Design Principles

1. **Progressive disclosure** — Show only what users need to scan and decide; reveal details on demand.
2. **Scanability** — Users should quickly compare products without opening each one.
3. **Thumb-friendly** — Primary actions (Add to Cart, Wishlist) remain accessible.
4. **Consistency** — Desktop experience unchanged; mobile gets a tailored, compact layout.

---

## Information Hierarchy

### Tier 1: Always visible (compact card)
Essential for quick scanning and comparison.

| Field | Rationale |
|-------|-----------|
| **Device name** | Primary identifier; users search by name. |
| **Price** | Key decision factor; always visible. |
| **Status badge** | In Stock / Low Stock / Out of Stock — quick availability scan. |
| **Grade** | Compact badge; helps filter quality at a glance. |

### Tier 2: Hidden on mobile, shown on tap
Secondary details for informed decisions.

| Field | Rationale |
|-------|-----------|
| **Brand** | Often inferred from device name; move to detail. |
| **Storage** | Important for purchase; show in detail. |
| **Qty** | Internal/wholesale info; show in detail. |
| **Updated** | Low priority for browsing; show in detail. |

### Tier 3: Actions
| Action | Compact card | Detail view |
|--------|--------------|-------------|
| **Add to Cart** | Keep (primary CTA) | Keep |
| **Wishlist** | Keep (secondary) | Keep |
| **Stock Request** | Keep (when out of stock) | Keep |

---

## Proposed Solutions

### Option A: Compact Card + Product Detail Bottom Sheet (Recommended)

**Compact card (list view):**
- Single row: Device name | Grade badge | Status badge | Price | Cart/Wishlist
- Height: ~56–64px per card
- Target: **5–6 cards** visible above the fold

**On tap:**
- Bottom sheet slides up with full details (Brand, Storage, Qty, Updated, etc.)
- Actions: Add to Cart, Wishlist
- Dismiss by swiping down or tapping outside

**Pros:** Familiar pattern (e.g. e-commerce apps), keeps user in context, fast to implement.  
**Cons:** Requires new `ProductDetailSheet` component.

---

### Option B: Compact Card + Enhanced Purchase Modal

**Compact card:** Same as Option A.

**On tap (Buy):**
- Reuse existing `PurchaseModal`
- Add a **detail summary** section at top (Brand, Grade, Storage, Qty, Updated) before quantity selector
- User sees full info only when adding to cart

**Pros:** No new component; minimal changes.  
**Cons:** Users can’t view details without intent to buy; Wishlist tap would need a different flow.

---

### Option C: Expandable Card (Accordion)

**Collapsed:** Device name, Price, Status, Grade, compact actions.  
**Expanded:** Full details inline (Brand, Storage, Qty, Updated).

**Pros:** No modal/sheet; all in one view.  
**Cons:** Pushing content down can feel jarring; harder to compare multiple expanded cards.

---

## Recommended Approach: Option A

Implement **Option A** for the best balance of density, clarity, and UX.

---

## Implementation Plan

### Phase 1: Compact Mobile Card

**File:** `src/page-components/UserProducts.tsx`

**Changes:**
1. Create a new compact card layout for `md:hidden`:
   - Horizontal layout: `flex items-center gap-2 py-2`
   - Left: Device name (truncate with `line-clamp-1`), Grade badge
   - Right: Status badge, Price, Wishlist icon, Cart icon
2. Reduce padding: `p-2` instead of `p-3`
3. Remove the 5-column grid (Brand, Grade, Storage, Qty, Price) on mobile
4. Remove "Updated" timestamp from compact card
5. Use smaller action buttons: `h-8 w-8` instead of `h-10 w-10`
6. Reduce spacing between cards: `space-y-2` instead of `space-y-3`

**Target height per card:** ~56px (vs. ~180px current)

---

### Phase 2: Product Detail Bottom Sheet

**New file:** `src/components/ProductDetailSheet.tsx`

**Behavior:**
- Uses `Sheet` from `@/components/ui/sheet` (or `Drawer` if available)
- Props: `open`, `onOpenChange`, `item: InventoryItem | null`
- Content:
  - Device name (header)
  - Full details: Brand, Grade, Storage, Qty, Updated
  - Status badge
  - Price
  - Actions: Wishlist, Add to Cart (opens PurchaseModal or inline quantity)
- Swipe-down to close (native sheet behavior)

**Integration:**
- Card tap opens `ProductDetailSheet` (not PurchaseModal directly)
- From sheet: "Add to Cart" opens `PurchaseModal` (existing flow)
- From sheet: Wishlist toggles and optionally closes sheet

---

### Phase 3: Interaction Flow

**Compact card:**
- **Tap card body** → Open `ProductDetailSheet` (view details)
- **Tap Cart icon** → Open `PurchaseModal` directly (quick add)
- **Tap Wishlist icon** → Toggle wishlist (no sheet)

**Rationale:** Power users can add to cart without opening the sheet; others can tap to see details first.

---

### Phase 4: Polish

1. **Reduce pagination height** on mobile (already partially done)
2. **Reduce filter bar** density on mobile if needed
3. **Add haptic feedback** (optional) on card tap for mobile
4. **Accessibility:** Ensure card is focusable, has `role="button"`, `aria-label` with device name

---

## Visual Mockup (Compact Card)

```
┌─────────────────────────────────────────────────────────┐
│ Samsung Galaxy S23    [A] [In Stock]    $400 CAD  ♡  🛒 │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Samsung Galaxy S22    [B] [Low Stock]   $320 CAD  ♡  🛒 │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Google Pixel 8        [BNS] [In Stock]  $270 CAD  ♡  🛒 │
└─────────────────────────────────────────────────────────┘
... (5–6 cards visible)
```

---

## File Changes Summary

| File | Action |
|------|--------|
| `src/page-components/UserProducts.tsx` | Replace mobile card layout with compact version; add tap handler for sheet |
| `src/components/ProductDetailSheet.tsx` | **New** — Bottom sheet with full product details |
| `src/components/ui/sheet.tsx` | Already exists — use for bottom sheet |
| `src/components/PurchaseModal.tsx` | No change (reused as-is) |

---

## Success Metrics

- **Cards visible above fold:** 5–6 (vs. 2 current)
- **Tap-to-detail:** &lt; 300ms to open sheet
- **Primary actions:** Cart and Wishlist remain one-tap from card
- **Desktop:** No regression; existing layout preserved

---

## Out of Scope (Future)

- Product images on cards
- Skeleton loading for cards
- Pull-to-refresh
- Infinite scroll as alternative to pagination
