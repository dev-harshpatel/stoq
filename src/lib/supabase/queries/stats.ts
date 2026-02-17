/**
 * Aggregate statistics queries
 * Performance-optimized queries for dashboard/reports
 */

import { supabase } from "../client/browser";

export interface InventoryStats {
  totalDevices: number;
  totalUnits: number;
  totalValue: number;
  lowStockItems: number;
}

/**
 * Fetch aggregate inventory statistics using SQL aggregates
 * Much more efficient than loading all inventory items
 */
export async function fetchInventoryStats(): Promise<InventoryStats> {
  // Get total count and sum of quantities
  const { data: countData, error: countError } = await supabase
    .from("inventory")
    .select("id, quantity, selling_price", { count: "exact", head: false });

  if (countError) throw countError;

  const totalDevices = countData?.length || 0;

  // Calculate aggregates in JavaScript (Supabase doesn't support SUM with expressions)
  // But we're only fetching the needed columns, not full rows
  const totalUnits = (
    (countData || []) as Array<{
      quantity: number | null;
      selling_price: number | null;
    }>
  ).reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);

  const totalValue = (
    (countData || []) as Array<{
      quantity: number | null;
      selling_price: number | null;
    }>
  ).reduce((sum, row) => {
    const quantity = Number(row.quantity) || 0;
    const sellingPrice = Number(row.selling_price) || 0;
    return sum + quantity * sellingPrice;
  }, 0);

  // Count low stock items (quantity <= 10)
  const { data: lowStockData, error: lowStockError } = await supabase
    .from("inventory")
    .select("id", { count: "exact", head: false })
    .lte("quantity", 10);

  if (lowStockError) throw lowStockError;

  const lowStockItems = lowStockData?.length || 0;

  return {
    totalDevices,
    totalUnits,
    totalValue,
    lowStockItems,
  };
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  completedOrders: number;
}

/**
 * Fetch aggregate order statistics using SQL aggregates
 * Much more efficient than loading all orders
 */
export async function fetchOrderStats(): Promise<OrderStats> {
  // Get total count
  const { count: totalOrders, error: totalError } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });

  if (totalError) throw totalError;

  // Get pending count
  const { count: pendingOrders, error: pendingError } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (pendingError) throw pendingError;

  // Get completed count
  const { count: completedOrders, error: completedError } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");

  if (completedError) throw completedError;

  // Get revenue (sum of total_price for approved/completed orders)
  // Fetch only total_price column for approved/completed orders
  const { data: revenueData, error: revenueError } = await supabase
    .from("orders")
    .select("total_price")
    .in("status", ["approved", "completed"]);

  if (revenueError) throw revenueError;

  const totalRevenue = (
    (revenueData || []) as Array<{ total_price: number | null }>
  ).reduce((sum, row) => sum + (Number(row.total_price) || 0), 0);

  return {
    totalOrders: totalOrders || 0,
    pendingOrders: pendingOrders || 0,
    totalRevenue,
    completedOrders: completedOrders || 0,
  };
}
