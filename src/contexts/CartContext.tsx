"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { InventoryItem } from "@/data/inventory";
import { useAuth } from "@/lib/auth/context";
import { useInventory } from "@/contexts/InventoryContext";
import { OrdersContext } from "@/contexts/OrdersContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import {
  loadCartFromLocalStorage,
  saveCartToLocalStorage,
  loadCartFromDatabase,
  saveCartToDatabase,
  cartItemsToStored,
  storedToCartItems,
  mergeCarts,
  clearGuestCart,
  StoredCartItem,
} from "@/lib/persistence/cart";
import { getAvailableQuantityForUser } from "@/lib/utils/order";
import { getTaxInfo, calculateTax } from "@/lib/tax";

export interface CartItem {
  item: InventoryItem;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: InventoryItem, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateItemPrice: (itemId: string, newPrice: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getUniqueItemsCount: () => number;
  getTotalPrice: () => number;
  getSubtotal: () => number;
  getTaxAmount: () => number;
  getTotalWithTax: () => number;
  taxRate: number;
  taxRatePercent: number;
  taxAmount: number;
  taxType: string;
  isTaxLoading: boolean;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider = ({ children }: CartProviderProps) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [taxRatePercent, setTaxRatePercent] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [taxType, setTaxType] = useState<string>("Tax");
  const [isTaxLoading, setIsTaxLoading] = useState(false);
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { inventory } = useInventory();

  // Safely get orders - may not be available in all contexts
  const ordersContext = useContext(OrdersContext);
  const orders = ordersContext?.orders || [];

  /**
   * Save cart — logged-in users go to DB, guests go to localStorage
   */
  const persistCart = useCallback(
    async (items: CartItem[]) => {
      const stored = cartItemsToStored(items);

      if (user?.id) {
        // Logged in: save to DB only (not localStorage)
        await saveCartToDatabase(user.id, stored);
      } else {
        // Guest: save to localStorage only
        saveCartToLocalStorage(stored);
      }
    },
    [user],
  );

  /**
   * Load cart from localStorage (guest) or database (logged in)
   * On login: merges any guest cart items into the user's DB cart, then clears guest storage
   * On logout: clears cart state (no cross-user leakage)
   */
  const loadCart = useCallback(async () => {
    if (inventory.length === 0) {
      return;
    }

    setIsLoading(true);

    try {
      let storedItems: StoredCartItem[] = [];

      if (user?.id) {
        // User just logged in — load their DB cart
        const dbItems = await loadCartFromDatabase(user.id);

        // Check if there's a guest cart to merge in (items added before login)
        const guestItems = loadCartFromLocalStorage();

        if (guestItems.length > 0) {
          // Merge guest items into the user's DB cart (DB wins conflicts)
          storedItems = mergeCarts(guestItems, dbItems);
          // Save merged result to DB
          await saveCartToDatabase(user.id, storedItems);
        } else {
          storedItems = dbItems;
        }

        // Always clear guest localStorage after login
        clearGuestCart();
      } else {
        // Guest user — load from localStorage only
        storedItems = loadCartFromLocalStorage();
      }

      const fullCartItems = await storedToCartItems(storedItems, inventory);
      setCartItems(fullCartItems);
    } catch (error) {
      // On error for guests, try localStorage as fallback
      if (!user?.id) {
        const localItems = loadCartFromLocalStorage();
        const fullCartItems = await storedToCartItems(localItems, inventory);
        setCartItems(fullCartItems);
      } else {
        setCartItems([]);
      }
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [user?.id, inventory]);

  // Load cart on mount when inventory is ready
  useEffect(() => {
    if (!isInitialized && inventory.length > 0) {
      loadCart();
    }
  }, [inventory.length, isInitialized, loadCart]);

  // Handle user login/logout - reload cart when user changes
  useEffect(() => {
    const currentUserId = user?.id || null;

    if (isInitialized && inventory.length > 0 && currentUserId !== lastUserId) {
      const previousUserId = lastUserId;
      setLastUserId(currentUserId);

      if (!currentUserId && previousUserId) {
        // Logout: clear cart immediately, don't load stale data
        setCartItems([]);
        clearGuestCart();
      } else {
        // Login or user switch: load the new user's cart (merges guest items)
        loadCart();
      }
    } else if (!isInitialized && inventory.length > 0) {
      setLastUserId(currentUserId);
    }
  }, [user?.id, isInitialized, inventory.length, lastUserId, loadCart]);

  const addToCart = (item: InventoryItem, quantity: number) => {
    setCartItems((prev) => {
      const existingItem = prev.find(
        (cartItem) => cartItem.item.id === item.id,
      );
      const existingQuantity = existingItem?.quantity || 0;
      const totalQuantity = existingQuantity + quantity;

      // Calculate available quantity accounting for pending orders
      // Note: getAvailableQuantityForUser already accounts for items in cart (prev)
      const availableQuantity = getAvailableQuantityForUser(
        item,
        user?.id || null,
        orders,
        prev,
      );

      // Available quantity already subtracts cart items, so we check if
      // the quantity we're trying to add exceeds what's available
      if (quantity > availableQuantity) {
        // Don't add if it would exceed - this should be caught by UI validation
        // but serves as a safety check
        return prev;
      }

      let newItems: CartItem[];

      if (existingItem) {
        newItems = prev.map((cartItem) =>
          cartItem.item.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem,
        );
      } else {
        newItems = [...prev, { item, quantity }];
      }

      // Persist to localStorage and database
      persistCart(newItems);

      return newItems;
    });
  };

  const removeFromCart = (itemId: string) => {
    setCartItems((prev) => {
      const newItems = prev.filter((cartItem) => cartItem.item.id !== itemId);
      persistCart(newItems);
      return newItems;
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCartItems((prev) => {
      const cartItem = prev.find((item) => item.item.id === itemId);
      if (!cartItem) return prev;

      // Calculate available quantity accounting for pending orders
      // availableQuantity = how many MORE can be added (already accounts for current cart)
      const availableQuantity = getAvailableQuantityForUser(
        cartItem.item,
        user?.id || null,
        orders,
        prev,
      );

      // Get current quantity in cart for this item
      const currentQuantity = cartItem.quantity;

      // Maximum allowed quantity = current quantity + available quantity
      const maxAllowedQuantity = currentQuantity + availableQuantity;

      // Validate that new quantity doesn't exceed maximum allowed
      if (quantity > maxAllowedQuantity) {
        // Don't update if it would exceed - this should be caught by UI validation
        // but serves as a safety check
        return prev;
      }

      const newItems = prev.map((item) =>
        item.item.id === itemId ? { ...item, quantity } : item,
      );
      persistCart(newItems);
      return newItems;
    });
  };

  const updateItemPrice = (itemId: string, newPrice: number) => {
    setCartItems((prev) => {
      const newItems = prev.map((cartItem) =>
        cartItem.item.id === itemId
          ? { ...cartItem, item: { ...cartItem.item, sellingPrice: newPrice } }
          : cartItem,
      );
      persistCart(newItems);
      return newItems;
    });
  };

  const clearCart = () => {
    setCartItems([]);
    persistCart([]);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, cartItem) => total + cartItem.quantity, 0);
  };

  const getUniqueItemsCount = () => {
    return cartItems.length;
  };

  const getTotalPrice = () => {
    return cartItems.reduce(
      (total, cartItem) =>
        total + cartItem.item.sellingPrice * cartItem.quantity,
      0,
    );
  };

  const getSubtotal = () => {
    return getTotalPrice();
  };

  const getTaxAmount = () => {
    return taxAmount;
  };

  const getTotalWithTax = () => {
    return getSubtotal() + taxAmount;
  };

  // Fetch tax info only when business location changes (avoid extra requests)
  useEffect(() => {
    const fetchTaxInfo = async () => {
      if (!user?.id || cartItems.length === 0) {
        setTaxRate(0);
        setTaxRatePercent(0);
        setTaxType("Tax");
        return;
      }

      if (!profile?.businessCountry || !profile.businessState) {
        setTaxRate(0);
        setTaxRatePercent(0);
        setTaxType("Tax");
        return;
      }

      setIsTaxLoading(true);
      try {
        const taxInfo = await getTaxInfo(
          profile.businessCountry,
          profile.businessState,
          profile.businessCity,
        );

        setTaxRate(taxInfo.taxRate);
        setTaxRatePercent(taxInfo.taxRatePercent);
        setTaxType(taxInfo.taxType);
      } finally {
        setIsTaxLoading(false);
      }
    };

    fetchTaxInfo();
  }, [
    cartItems.length,
    profile?.businessCity,
    profile?.businessCountry,
    profile?.businessState,
    user?.id,
  ]);

  // Recompute tax amount locally when cart changes (no network)
  useEffect(() => {
    if (!user?.id || cartItems.length === 0) {
      setTaxAmount(0);
      return;
    }

    if (taxRate <= 0) {
      setTaxAmount(0);
      return;
    }

    setTaxAmount(calculateTax(getSubtotal(), taxRate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems, taxRate, user?.id]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateItemPrice,
        clearCart,
        getTotalItems,
        getUniqueItemsCount,
        getTotalPrice,
        getSubtotal,
        getTaxAmount,
        getTotalWithTax,
        taxRate,
        taxRatePercent,
        taxAmount,
        taxType,
        isTaxLoading,
        isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
