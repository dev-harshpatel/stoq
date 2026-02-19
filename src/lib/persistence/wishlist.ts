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
 * Load wishlist from database for a user (uses wishlist_items JSONB on user_profiles)
 */
export const loadWishlistFromDatabase = async (
  userId: string
): Promise<StoredWishlistItem[]> => {
  try {
    const { supabase } = await import("../supabase/client");
    const { data, error } = await supabase
      .from("user_profiles")
      .select("wishlist_items")
      .eq("user_id", userId)
      .single<{ wishlist_items: StoredWishlistItem[] | null }>();

    if (error || !data) {
      console.error("Error loading wishlist from database:", error);
      return [];
    }

    const wishlistItems = data.wishlist_items;
    if (!wishlistItems || !Array.isArray(wishlistItems)) return [];

    return wishlistItems.map((item) => ({
      itemId: item.itemId,
      addedAt: item.addedAt,
    }));
  } catch (error) {
    console.error("Error loading wishlist from database:", error);
    return [];
  }
};

/**
 * Save wishlist to database for a user (uses wishlist_items JSONB on user_profiles)
 */
export const saveWishlistToDatabase = async (
  userId: string,
  items: StoredWishlistItem[]
): Promise<void> => {
  try {
    const { supabase } = await import("../supabase/client");

    const { error } = await (supabase.from("user_profiles") as any)
      .update({ wishlist_items: items })
      .eq("user_id", userId);

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
