'use client'

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { InventoryItem } from "@/data/inventory";
import { useAuth } from "@/lib/auth/context";
import { useInventory } from "@/contexts/InventoryContext";
import {
  loadWishlistFromLocalStorage,
  saveWishlistToLocalStorage,
  loadWishlistFromDatabase,
  saveWishlistToDatabase,
  wishlistItemsToStored,
  storedToWishlistItems,
  mergeWishlists,
  StoredWishlistItem,
} from "@/lib/wishlistPersistence";

interface WishlistContextType {
  wishlistItems: InventoryItem[];
  addToWishlist: (item: InventoryItem) => void;
  removeFromWishlist: (itemId: string) => void;
  isInWishlist: (itemId: string) => boolean;
  toggleWishlist: (item: InventoryItem) => void;
  clearWishlist: () => void;
  getWishlistCount: () => number;
  isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
};

interface WishlistProviderProps {
  children: ReactNode;
}

export const WishlistProvider = ({ children }: WishlistProviderProps) => {
  const [wishlistItems, setWishlistItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  const { user } = useAuth();
  const { inventory } = useInventory();

  /**
   * Save wishlist to both localStorage and database (if logged in)
   */
  const persistWishlist = useCallback(
    async (items: InventoryItem[]) => {
      const stored = wishlistItemsToStored(items);

      // Always save to localStorage
      saveWishlistToLocalStorage(stored);

      // If user is logged in, also save to database
      if (user?.id) {
        await saveWishlistToDatabase(user.id, stored);
      }
    },
    [user]
  );

  /**
   * Load wishlist from localStorage or database
   */
  const loadWishlist = useCallback(async () => {
    if (inventory.length === 0) {
      // Wait for inventory to load
      return;
    }

    setIsLoading(true);

    try {
      let storedItems: StoredWishlistItem[] = [];

      if (user?.id) {
        // User is logged in - load from database
        const dbItems = await loadWishlistFromDatabase(user.id);
        const localItems = loadWishlistFromLocalStorage();

        // Merge localStorage wishlist with database wishlist
        storedItems = mergeWishlists(localItems, dbItems);

        // Save merged wishlist back to both
        saveWishlistToLocalStorage(storedItems);
        await saveWishlistToDatabase(user.id, storedItems);
      } else {
        // Guest user - load from localStorage only
        storedItems = loadWishlistFromLocalStorage();
      }

      // Convert stored items to full wishlist items (with inventory data)
      const fullWishlistItems = await storedToWishlistItems(storedItems, inventory);

      setWishlistItems(fullWishlistItems);
    } catch (error) {
      // On error, try to load from localStorage as fallback
      const localItems = loadWishlistFromLocalStorage();
      const fullWishlistItems = await storedToWishlistItems(localItems, inventory);
      setWishlistItems(fullWishlistItems);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [user?.id, inventory]);

  // Load wishlist on mount when inventory is ready
  useEffect(() => {
    if (!isInitialized && inventory.length > 0) {
      loadWishlist();
    }
  }, [inventory.length, isInitialized, loadWishlist]);

  // Handle user login/logout - reload wishlist when user changes
  useEffect(() => {
    const currentUserId = user?.id || null;

    // Only reload if user actually changed (login or logout)
    if (isInitialized && inventory.length > 0 && currentUserId !== lastUserId) {
      setLastUserId(currentUserId);
      loadWishlist();
    } else if (!isInitialized && inventory.length > 0) {
      // Set initial user ID
      setLastUserId(currentUserId);
    }
  }, [user?.id, isInitialized, inventory.length, lastUserId, loadWishlist]);

  // Update wishlist items when inventory changes (to get latest quantities/prices)
  useEffect(() => {
    if (isInitialized && inventory.length > 0) {
      setWishlistItems((prev) => {
        return prev.map((wishlistItem) => {
          const updatedItem = inventory.find((inv) => inv.id === wishlistItem.id);
          return updatedItem || wishlistItem;
        }).filter((item) => inventory.some((inv) => inv.id === item.id));
      });
    }
  }, [inventory, isInitialized]);

  const addToWishlist = (item: InventoryItem) => {
    setWishlistItems((prev) => {
      // Check if item already exists
      if (prev.some((wishlistItem) => wishlistItem.id === item.id)) {
        return prev;
      }

      const newItems = [...prev, item];
      persistWishlist(newItems);
      return newItems;
    });
  };

  const removeFromWishlist = (itemId: string) => {
    setWishlistItems((prev) => {
      const newItems = prev.filter((item) => item.id !== itemId);
      persistWishlist(newItems);
      return newItems;
    });
  };

  const isInWishlist = (itemId: string) => {
    return wishlistItems.some((item) => item.id === itemId);
  };

  const toggleWishlist = (item: InventoryItem) => {
    if (isInWishlist(item.id)) {
      removeFromWishlist(item.id);
    } else {
      addToWishlist(item);
    }
  };

  const clearWishlist = () => {
    setWishlistItems([]);
    persistWishlist([]);
  };

  const getWishlistCount = () => {
    return wishlistItems.length;
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        toggleWishlist,
        clearWishlist,
        getWishlistCount,
        isLoading,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};
