/**
 * Wishlist Persistence Utilities
 * Handles localStorage and database sync for wishlist items
 */

import { InventoryItem } from "@/data/inventory";
import { Database } from "@/lib/database.types";
import { supabase } from "./supabase/client";

const WISHLIST_STORAGE_KEY = "stoq_wishlist_items";

/**
 * Simplified wishlist item format for storage (only IDs)
 */
export interface StoredWishlistItem {
  itemId: string;
}

type WishlistRow = Pick<
  Database["public"]["Tables"]["user_profiles"]["Row"],
  "wishlist_items"
>;

const isStoredWishlistItem = (value: unknown): value is StoredWishlistItem => {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (!("itemId" in value)) {
    return false;
  }

  return typeof (value as { itemId?: unknown }).itemId === "string";
};

/**
 * Load wishlist from localStorage
 */
export const loadWishlistFromLocalStorage = (): StoredWishlistItem[] => {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as StoredWishlistItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

/**
 * Save wishlist to localStorage
 */
export const saveWishlistToLocalStorage = (
  items: StoredWishlistItem[],
): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    // localStorage might be full or disabled - silently fail
  }
};

/**
 * Convert InventoryItem[] to StoredWishlistItem[]
 */
export const wishlistItemsToStored = (
  items: InventoryItem[],
): StoredWishlistItem[] => {
  return items.map((item) => ({
    itemId: item.id,
  }));
};

/**
 * Convert StoredWishlistItem[] to InventoryItem[] by fetching full item details from inventory
 */
export const storedToWishlistItems = async (
  stored: StoredWishlistItem[],
  inventory: InventoryItem[],
): Promise<InventoryItem[]> => {
  const wishlistItems: InventoryItem[] = [];

  for (const storedItem of stored) {
    const inventoryItem = inventory.find(
      (item) => item.id === storedItem.itemId,
    );

    // Only include items that still exist in inventory
    if (inventoryItem) {
      wishlistItems.push(inventoryItem);
    }
  }

  return wishlistItems;
};

/**
 * Load wishlist from database for logged-in user
 */
export const loadWishlistFromDatabase = async (
  userId: string,
): Promise<StoredWishlistItem[]> => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("wishlist_items")
      .eq("user_id", userId)
      .single();

    if (error || !data) return [];

    const row = data as unknown as WishlistRow;
    const wishlistItems = row.wishlist_items;

    if (!Array.isArray(wishlistItems)) {
      return [];
    }

    return (wishlistItems as unknown[]).filter(isStoredWishlistItem);
  } catch (error) {
    return [];
  }
};

/**
 * Save wishlist to database for logged-in user
 */
export const saveWishlistToDatabase = async (
  userId: string,
  items: StoredWishlistItem[],
): Promise<boolean> => {
  try {
    const { error } = await (supabase.from("user_profiles") as any)
      .update({ wishlist_items: items })
      .eq("user_id", userId);

    return !error;
  } catch (error) {
    return false;
  }
};

/**
 * Merge two wishlist arrays (remove duplicates)
 */
export const mergeWishlists = (
  list1: StoredWishlistItem[],
  list2: StoredWishlistItem[],
): StoredWishlistItem[] => {
  const merged = new Set<string>();

  // Add items from both lists
  for (const item of list1) {
    merged.add(item.itemId);
  }
  for (const item of list2) {
    merged.add(item.itemId);
  }

  return Array.from(merged).map((itemId) => ({ itemId }));
};
