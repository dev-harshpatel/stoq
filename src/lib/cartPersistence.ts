/**
 * Cart Persistence Utilities
 * Handles localStorage and database sync for cart items
 */

import { CartItem } from '@/contexts/CartContext';
import { InventoryItem } from '@/data/inventory';
import { supabase } from './supabase/client';

const CART_STORAGE_KEY = 'stoq_cart_items';

/**
 * Simplified cart item format for storage (only IDs and quantities)
 */
export interface StoredCartItem {
  itemId: string;
  quantity: number;
}

/**
 * Load cart from localStorage
 */
export const loadCartFromLocalStorage = (): StoredCartItem[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored) as StoredCartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

/**
 * Save cart to localStorage
 */
export const saveCartToLocalStorage = (items: StoredCartItem[]): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    // localStorage might be full or disabled - silently fail
  }
};

/**
 * Convert CartItem[] to StoredCartItem[]
 */
export const cartItemsToStored = (cartItems: CartItem[]): StoredCartItem[] => {
  return cartItems.map(({ item, quantity }) => ({
    itemId: item.id,
    quantity,
  }));
};

/**
 * Convert StoredCartItem[] to CartItem[] by fetching full item details from inventory
 */
export const storedToCartItems = async (
  stored: StoredCartItem[],
  inventory: InventoryItem[]
): Promise<CartItem[]> => {
  const cartItems: CartItem[] = [];
  
  for (const storedItem of stored) {
    const inventoryItem = inventory.find((item) => item.id === storedItem.itemId);
    
    // Only include items that still exist in inventory
    if (inventoryItem) {
      cartItems.push({
        item: inventoryItem,
        quantity: storedItem.quantity,
      });
    }
  }
  
  return cartItems;
};

/**
 * Load cart from database for logged-in user
 */
export const loadCartFromDatabase = async (userId: string): Promise<StoredCartItem[]> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('cart_items')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) return [];
    
    // Type assertion for cart_items field
    const profileData = data as { cart_items: any };
    const cartItems = profileData.cart_items;
    if (!cartItems || !Array.isArray(cartItems)) return [];
    
    return cartItems as StoredCartItem[];
  } catch (error) {
    return [];
  }
};

/**
 * Save cart to database for logged-in user
 */
export const saveCartToDatabase = async (
  userId: string,
  items: StoredCartItem[]
): Promise<boolean> => {
  try {
    const { error } = await (supabase
      .from('user_profiles') as any)
      .update({ cart_items: items })
      .eq('user_id', userId);
    
    return !error;
  } catch (error) {
    return false;
  }
};

/**
 * Merge two cart arrays (combine quantities for same items)
 */
export const mergeCarts = (
  cart1: StoredCartItem[],
  cart2: StoredCartItem[]
): StoredCartItem[] => {
  const merged = new Map<string, number>();
  
  // Add items from first cart
  for (const item of cart1) {
    merged.set(item.itemId, item.quantity);
  }
  
  // Merge items from second cart (add quantities)
  for (const item of cart2) {
    const existing = merged.get(item.itemId) || 0;
    merged.set(item.itemId, existing + item.quantity);
  }
  
  return Array.from(merged.entries()).map(([itemId, quantity]) => ({
    itemId,
    quantity,
  }));
};
