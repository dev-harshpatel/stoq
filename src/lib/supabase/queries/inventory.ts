/**
 * Inventory queries
 * Functions for querying inventory data from Supabase
 */

import { InventoryItem } from "@/data/inventory";
import type { PaginatedResult } from "@/hooks/use-paginated-query";
import { supabase } from "../client/browser";
import { INVENTORY_SORT_ORDER } from "../../constants";
import { dbRowToInventoryItem } from "./mappers";
import type { FilterValues } from "@/components/FilterBar";

export type InventoryFilters = FilterValues;

// Columns safe for regular users / public views
export const INVENTORY_PUBLIC_FIELDS = [
  "id",
  "device_name",
  "brand",
  "grade",
  "storage",
  "quantity",
  "selling_price",
  "last_updated",
  "price_change",
  "is_active",
].join(", ");

// Columns required for admin views (includes cost/margin data)
export const INVENTORY_ADMIN_FIELDS = [
  "id",
  "device_name",
  "brand",
  "grade",
  "storage",
  "quantity",
  "price_per_unit",
  "purchase_price",
  "hst",
  "selling_price",
  "last_updated",
  "price_change",
  "is_active",
].join(", ");

// Helper applies filters to a Supabase query builder.
// Query builder typing is complex; allow `any` here for ergonomics.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyInventoryFilters(query: any, filters: InventoryFilters) {
  if (filters.search) {
    query = query.ilike("device_name", `%${filters.search}%`);
  }
  if (filters.brand !== "all") {
    query = query.eq("brand", filters.brand);
  }
  if (filters.grade !== "all") {
    query = query.eq("grade", filters.grade);
  }
  if (filters.storage !== "all") {
    query = query.eq("storage", filters.storage);
  }
  if (filters.priceRange !== "all") {
    switch (filters.priceRange) {
      case "under200":
        query = query.lt("selling_price", 200);
        break;
      case "200-400":
        query = query.gte("selling_price", 200).lte("selling_price", 400);
        break;
      case "400+":
        query = query.gte("selling_price", 400);
        break;
    }
  }
  if (filters.stockStatus !== "all") {
    switch (filters.stockStatus) {
      case "in-stock":
        // Treat "In Stock" as any item with quantity > 0,
        // regardless of whether it's low or critical.
        query = query.gt("quantity", 0);
        break;
      case "low-stock":
        query = query.gte("quantity", 5).lte("quantity", 10);
        break;
      case "critical":
        query = query.gt("quantity", 0).lt("quantity", 5);
        break;
      case "out-of-stock":
        query = query.eq("quantity", 0);
        break;
    }
  }
  return query;
}

export async function fetchPaginatedInventory(
  filters: InventoryFilters,
  range: { from: number; to: number },
  options?: { showInactive?: boolean; includeAdminFields?: boolean }
): Promise<PaginatedResult<InventoryItem>> {
  const fields = options?.includeAdminFields
    ? INVENTORY_ADMIN_FIELDS
    : INVENTORY_PUBLIC_FIELDS;

  let query = supabase
    .from("inventory")
    .select(fields, { count: "exact" })
    .order("created_at", INVENTORY_SORT_ORDER.created_at)
    .order("id", INVENTORY_SORT_ORDER.id); // Stable sort - prevents reshuffling when created_at ties

  if (!options?.showInactive) {
    query = query.eq("is_active", true);
  }

  query = applyInventoryFilters(query, filters);
  query = query.range(range.from, range.to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    data: (data || []).map(dbRowToInventoryItem),
    count: count || 0,
  };
}

export async function fetchFilterOptions(): Promise<{
  brands: string[];
  storageOptions: string[];
}> {
  const { data, error } = await supabase
    .from("inventory")
    .select("brand, storage");

  if (error || !data) return { brands: [], storageOptions: [] };

  const rows = (data || []) as Array<{
    brand: string | null;
    storage: string | null;
  }>;

  const brands = Array.from(new Set(rows.map((r) => r.brand)))
    .filter(Boolean)
    .sort() as string[];

  const storageOptions = Array.from(new Set(rows.map((r) => r.storage)))
    .filter(Boolean)
    .sort((a: string, b: string) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    }) as string[];

  return { brands, storageOptions };
}

export async function fetchAllFilteredInventory(
  filters: InventoryFilters,
  options?: { showInactive?: boolean; includeAdminFields?: boolean }
): Promise<InventoryItem[]> {
  const fields = options?.includeAdminFields
    ? INVENTORY_ADMIN_FIELDS
    : INVENTORY_PUBLIC_FIELDS;

  let query = supabase
    .from("inventory")
    .select(fields)
    .order("created_at", INVENTORY_SORT_ORDER.created_at)
    .order("id", INVENTORY_SORT_ORDER.id);

  if (!options?.showInactive) {
    query = query.eq("is_active", true);
  }

  query = applyInventoryFilters(query, filters);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(dbRowToInventoryItem);
}

/**
 * Fetch inventory items by their IDs
 * Used for wishlist and other targeted queries
 */
export async function fetchInventoryByIds(
  itemIds: string[]
): Promise<InventoryItem[]> {
  if (itemIds.length === 0) return [];

  const { data, error } = await supabase
    .from("inventory")
    .select(INVENTORY_PUBLIC_FIELDS)
    .in("id", itemIds)
    .eq("is_active", true)
    .order("created_at", INVENTORY_SORT_ORDER.created_at)
    .order("id", INVENTORY_SORT_ORDER.id);

  if (error) throw error;

  return (data || []).map(dbRowToInventoryItem);
}
