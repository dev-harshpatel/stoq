/**
 * Wishlist persistence utilities
 * Handles loading/saving wishlist to localStorage and database
 */

import { InventoryItem } from "@/data/inventory";
import { fetchInventoryByIds } from "../supabase/queries";

export interface StoredWishlistItem {
  itemId: string;
  addedAt: string;
}

const WISHLIST_STORAGE_KEY = "stoq_wishlist";

/**
 * Load wishlist from localStorage
 */
export const loadWishlistFromLocalStorage = (): StoredWishlistItem[] => {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Save wishlist to localStorage
 */
export const saveWishlistToLocalStorage = (
  items: StoredWishlistItem[]
): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Failed to save wishlist to localStorage:", error);
  }
};

/**
 * Convert wishlist items to stored format
 */
export const wishlistItemsToStored = (
  items: InventoryItem[]
): StoredWishlistItem[] => {
  return items.map((item) => ({
    itemId: item.id,
    addedAt: new Date().toISOString(),
  }));
};

/**
 * Convert stored wishlist items back to InventoryItem array
 * Uses targeted query to fetch only needed items
 */
export const storedToWishlistItems = async (
  stored: StoredWishlistItem[],
  inventory?: InventoryItem[]
): Promise<InventoryItem[]> => {
  if (stored.length === 0) return [];

  // Use targeted query if no inventory provided
  if (!inventory) {
    const itemIds = stored.map((s) => s.itemId);
    return await fetchInventoryByIds(itemIds);
  }

  // Fallback to provided inventory array
  const items: InventoryItem[] = [];
  for (const storedItem of stored) {
    const item = inventory.find((inv) => inv.id === storedItem.itemId);
    if (item) {
      items.push(item);
    }
  }
  return items;
};

/**
 * Load wishlist from database for a user
 */
export const loadWishlistFromDatabase = async (
  userId: string
): Promise<StoredWishlistItem[]> => {
  try {
    const { supabase } = await import("../supabase/client");
    const { data, error } = await (supabase.from("wishlists") as any)
      .select("item_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading wishlist from database:", error);
      return [];
    }

    return (data || []).map((row: any) => ({
      itemId: row.item_id,
      addedAt: row.created_at,
    }));
  } catch (error) {
    console.error("Error loading wishlist from database:", error);
    return [];
  }
};

/**
 * Save wishlist to database for a user
 */
export const saveWishlistToDatabase = async (
  userId: string,
  items: StoredWishlistItem[]
): Promise<void> => {
  try {
    const { supabase } = await import("../supabase/client");

    // Delete existing wishlist items
    await (supabase.from("wishlists") as any).delete().eq("user_id", userId);

    if (items.length === 0) return;

    // Insert new wishlist items
    const wishlistRows = items.map((item) => ({
      user_id: userId,
      item_id: item.itemId,
      created_at: item.addedAt,
    }));

    const { error } = await (supabase.from("wishlists") as any).insert(
      wishlistRows
    );

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error saving wishlist to database:", error);
    throw error;
  }
};

/**
 * Merge localStorage and database wishlists
 * Database takes precedence for conflicts
 */
export const mergeWishlists = (
  local: StoredWishlistItem[],
  db: StoredWishlistItem[]
): StoredWishlistItem[] => {
  const merged = new Map<string, StoredWishlistItem>();

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
