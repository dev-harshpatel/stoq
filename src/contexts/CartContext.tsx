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
  StoredCartItem,
} from "@/lib/cartPersistence";
import { getAvailableQuantityForUser } from "@/lib/orderUtils";
import { getTaxInfo, calculateTax } from "@/lib/taxUtils";

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
   * Save cart to both localStorage and database (if logged in)
   */
  const persistCart = useCallback(
    async (items: CartItem[]) => {
      const stored = cartItemsToStored(items);

      // Always save to localStorage
      saveCartToLocalStorage(stored);

      // If user is logged in, also save to database
      if (user?.id) {
        await saveCartToDatabase(user.id, stored);
      }
    },
    [user],
  );

  /**
   * Load cart from localStorage or database
   */
  const loadCart = useCallback(async () => {
    if (inventory.length === 0) {
      // Wait for inventory to load
      return;
    }

    setIsLoading(true);

    try {
      let storedItems: StoredCartItem[] = [];

      if (user?.id) {
        // User is logged in - load from database
        const dbItems = await loadCartFromDatabase(user.id);
        const localItems = loadCartFromLocalStorage();

        // Merge localStorage cart with database cart
        storedItems = mergeCarts(localItems, dbItems);

        // Save merged cart back to both
        saveCartToLocalStorage(storedItems);
        await saveCartToDatabase(user.id, storedItems);
      } else {
        // Guest user - load from localStorage only
        storedItems = loadCartFromLocalStorage();
      }

      // Convert stored items to full cart items (with inventory data)
      const fullCartItems = await storedToCartItems(storedItems, inventory);

      setCartItems(fullCartItems);
    } catch (error) {
      // On error, try to load from localStorage as fallback
      const localItems = loadCartFromLocalStorage();
      const fullCartItems = await storedToCartItems(localItems, inventory);
      setCartItems(fullCartItems);
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

    // Only reload if user actually changed (login or logout)
    if (isInitialized && inventory.length > 0 && currentUserId !== lastUserId) {
      setLastUserId(currentUserId);
      loadCart();
    } else if (!isInitialized && inventory.length > 0) {
      // Set initial user ID
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
          ? { ...cartItem, item: { ...cartItem.item, pricePerUnit: newPrice } }
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
        total + cartItem.item.pricePerUnit * cartItem.quantity,
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

  // Calculate tax when cart items or user changes
  useEffect(() => {
    const calculateTaxForCart = async () => {
      if (!user?.id || cartItems.length === 0) {
        setTaxRate(0);
        setTaxRatePercent(0);
        setTaxAmount(0);
        setTaxType("Tax");
        return;
      }

      setIsTaxLoading(true);
      try {
        if (!profile?.businessCountry || !profile.businessState) {
          // User hasn't set business location
          setTaxRate(0);
          setTaxRatePercent(0);
          setTaxAmount(0);
          setTaxType("Tax");
          return;
        }

        // Get tax info
        const taxInfo = await getTaxInfo(
          profile.businessCountry,
          profile.businessState,
          profile.businessCity,
        );

        const subtotal = getSubtotal();
        const calculatedTax = calculateTax(subtotal, taxInfo.taxRate);

        setTaxRate(taxInfo.taxRate);
        setTaxRatePercent(taxInfo.taxRatePercent);
        setTaxAmount(calculatedTax);
        setTaxType(taxInfo.taxType);
      } catch (error) {
        // On error, set tax to 0
        setTaxRate(0);
        setTaxRatePercent(0);
        setTaxAmount(0);
        setTaxType("Tax");
      } finally {
        setIsTaxLoading(false);
      }
    };

    calculateTaxForCart();
  }, [
    cartItems,
    profile?.businessCity,
    profile?.businessCountry,
    profile?.businessState,
    user?.id,
  ]);

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
