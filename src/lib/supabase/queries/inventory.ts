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
        query = query.gt("quantity", 10);
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
  range: { from: number; to: number }
): Promise<PaginatedResult<InventoryItem>> {
  let query = supabase
    .from("inventory")
    .select("*", { count: "exact" })
    .order("created_at", INVENTORY_SORT_ORDER.created_at)
    .order("id", INVENTORY_SORT_ORDER.id); // Stable sort - prevents reshuffling when created_at ties

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

  const brands = Array.from(new Set(data.map((r: any) => r.brand)))
    .filter(Boolean)
    .sort() as string[];

  const storageOptions = Array.from(new Set(data.map((r: any) => r.storage)))
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
  filters: InventoryFilters
): Promise<InventoryItem[]> {
  let query = supabase
    .from("inventory")
    .select("*")
    .order("created_at", INVENTORY_SORT_ORDER.created_at)
    .order("id", INVENTORY_SORT_ORDER.id);

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
    .select("*")
    .in("id", itemIds)
    .order("created_at", INVENTORY_SORT_ORDER.created_at)
    .order("id", INVENTORY_SORT_ORDER.id);

  if (error) throw error;

  return (data || []).map(dbRowToInventoryItem);
}
