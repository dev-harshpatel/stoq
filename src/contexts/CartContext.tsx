import { createContext, useContext, useState, ReactNode } from "react";
import { InventoryItem } from "@/data/inventory";

export interface CartItem {
  item: InventoryItem;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: InventoryItem, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getUniqueItemsCount: () => number;
  getTotalPrice: () => number;
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

  const addToCart = (item: InventoryItem, quantity: number) => {
    setCartItems((prev) => {
      const existingItem = prev.find((cartItem) => cartItem.item.id === item.id);
      if (existingItem) {
        return prev.map((cartItem) =>
          cartItem.item.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      }
      return [...prev, { item, quantity }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCartItems((prev) => prev.filter((cartItem) => cartItem.item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((cartItem) =>
        cartItem.item.id === itemId ? { ...cartItem, quantity } : cartItem
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, cartItem) => total + cartItem.quantity, 0);
  };

  const getUniqueItemsCount = () => {
    return cartItems.length;
  };

  const getTotalPrice = () => {
    return cartItems.reduce(
      (total, cartItem) => total + cartItem.item.pricePerUnit * cartItem.quantity,
      0
    );
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalItems,
        getUniqueItemsCount,
        getTotalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

