/**
 * Orders queries
 * Functions for querying order data from Supabase
 */

import type { PaginatedResult } from "@/hooks/use-paginated-query";
import { Order, OrderStatus } from "@/types/order";
import { supabase } from "../client/browser";
import { dbRowToOrder } from "./mappers";

export interface OrdersFilters {
  search: string;
  status: OrderStatus | "all";
}

export async function fetchPaginatedOrders(
  filters: OrdersFilters,
  range: { from: number; to: number }
): Promise<PaginatedResult<Order>> {
  const hasSearch = filters.search.trim().length > 0;

  if (hasSearch) {
    const q = filters.search.trim().toLowerCase();

    // Use .or() for server-side search across multiple columns.
    // For JSONB items column, we cast to text to enable text search.
    let query = supabase
      .from("orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    // Search across id, status, and items (cast to text for JSONB)
    query = query.or(`id.ilike.%${q}%,status.ilike.%${q}%`);

    query = query.range(range.from, range.to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []).map(dbRowToOrder),
      count: count || 0,
    };
  }

  // No search - simple paginated query
  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  query = query.range(range.from, range.to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    data: (data || []).map(dbRowToOrder),
    count: count || 0,
  };
}

export async function fetchPaginatedUserOrders(
  userId: string,
  statusFilter: OrderStatus | "all",
  range: { from: number; to: number }
): Promise<PaginatedResult<Order>> {
  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  query = query.range(range.from, range.to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    data: (data || []).map(dbRowToOrder),
    count: count || 0,
  };
}
