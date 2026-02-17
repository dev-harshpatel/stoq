/**
 * Cart persistence utilities
 * Handles loading/saving cart to localStorage and database
 */

import { InventoryItem } from "@/data/inventory";
import { fetchInventoryByIds } from "../supabase/queries";

export interface StoredCartItem {
  itemId: string;
  quantity: number;
}

const CART_STORAGE_KEY = "stoq_cart";

/**
 * Load cart from localStorage
 */
export const loadCartFromLocalStorage = (): StoredCartItem[] => {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Save cart to localStorage
 */
export const saveCartToLocalStorage = (items: StoredCartItem[]): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Failed to save cart to localStorage:", error);
  }
};

/**
 * Convert cart items to stored format
 */
export const cartItemsToStored = (
  cartItems: Array<{ item: InventoryItem; quantity: number }>
): StoredCartItem[] => {
  return cartItems.map((cartItem) => ({
    itemId: cartItem.item.id,
    quantity: cartItem.quantity,
  }));
};

/**
 * Convert stored cart items back to InventoryItem array with quantities
 * Uses targeted query to fetch only needed items
 */
export const storedToCartItems = async (
  stored: StoredCartItem[],
  inventory?: InventoryItem[]
): Promise<Array<{ item: InventoryItem; quantity: number }>> => {
  if (stored.length === 0) return [];

  let items: InventoryItem[];

  // Use targeted query if no inventory provided
  if (!inventory) {
    const itemIds = stored.map((s) => s.itemId);
    items = await fetchInventoryByIds(itemIds);
  } else {
    // Fallback to provided inventory array
    items = [];
    for (const storedItem of stored) {
      const item = inventory.find((inv) => inv.id === storedItem.itemId);
      if (item) {
        items.push(item);
      }
    }
  }

  // Map to cart items with quantities
  return stored
    .map((storedItem) => {
      const item = items.find((inv) => inv.id === storedItem.itemId);
      if (!item) return null;
      return { item, quantity: storedItem.quantity };
    })
    .filter(
      (cartItem): cartItem is { item: InventoryItem; quantity: number } =>
        cartItem !== null
    );
};

/**
 * Load cart from database for a user
 */
export const loadCartFromDatabase = async (
  userId: string
): Promise<StoredCartItem[]> => {
  try {
    const { supabase } = await import("../supabase/client");
    const { data, error } = await supabase
      .from("carts")
      .select("item_id, quantity")
      .eq("user_id", userId);

    if (error) {
      console.error("Error loading cart from database:", error);
      return [];
    }

    return (data || []).map((row: any) => ({
      itemId: row.item_id,
      quantity: row.quantity,
    }));
  } catch (error) {
    console.error("Error loading cart from database:", error);
    return [];
  }
};

/**
 * Save cart to database for a user
 */
export const saveCartToDatabase = async (
  userId: string,
  items: StoredCartItem[]
): Promise<void> => {
  try {
    const { supabase } = await import("../supabase/client");

    // Delete existing cart items
    await (supabase.from("carts") as any).delete().eq("user_id", userId);

    if (items.length === 0) return;

    // Insert new cart items
    const cartRows = items.map((item) => ({
      user_id: userId,
      item_id: item.itemId,
      quantity: item.quantity,
    }));

    const { error } = await (supabase.from("carts") as any).insert(cartRows);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error saving cart to database:", error);
    throw error;
  }
};

/**
 * Merge localStorage and database carts
 * Database takes precedence for conflicts
 */
export const mergeCarts = (
  local: StoredCartItem[],
  db: StoredCartItem[]
): StoredCartItem[] => {
  const merged = new Map<string, StoredCartItem>();

  // Add localStorage items first
  for (const item of local) {
    merged.set(item.itemId, item);
  }

  // Database items override localStorage (newer/more authoritative)
  for (const item of db) {
    merged.set(item.itemId, item);
  }

  return Array.from(merged.values());
};
