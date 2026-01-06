import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Order, OrderStatus, OrderItem } from "@/types/order";
import { InventoryItem } from "@/data/inventory";

interface OrdersContextType {
  orders: Order[];
  createOrder: (userId: string, username: string, items: OrderItem[]) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  getUserOrders: (userId: string) => Order[];
  getAllOrders: () => Order[];
  getOrderById: (orderId: string) => Order | undefined;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error("useOrders must be used within an OrdersProvider");
  }
  return context;
};

interface OrdersProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = "stoq-orders";

const loadOrdersFromStorage = (): Order[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load orders from storage:", error);
  }
  return [];
};

const saveOrdersToStorage = (orders: Order[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (error) {
    console.error("Failed to save orders to storage:", error);
  }
};

export const OrdersProvider = ({ children }: OrdersProviderProps) => {
  const [orders, setOrders] = useState<Order[]>(loadOrdersFromStorage());

  // Sync orders across browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const updatedOrders = JSON.parse(e.newValue);
          setOrders(updatedOrders);
        } catch (error) {
          console.error("Failed to parse orders from storage event:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const createOrder = (userId: string, username: string, items: OrderItem[]): Order => {
    const totalPrice = items.reduce(
      (total, orderItem) => total + orderItem.item.pricePerUnit * orderItem.quantity,
      0
    );

    const newOrder: Order = {
      id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      username,
      items,
      totalPrice,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setOrders((prev) => {
      const updated = [...prev, newOrder];
      saveOrdersToStorage(updated);
      return updated;
    });
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) => {
      const updated = prev.map((order) =>
        order.id === orderId
          ? { ...order, status, updatedAt: new Date().toISOString() }
          : order
      );
      saveOrdersToStorage(updated);
      return updated;
    });
  };

  const getUserOrders = (userId: string): Order[] => {
    return orders.filter((order) => order.userId === userId).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const getAllOrders = (): Order[] => {
    return [...orders].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const getOrderById = (orderId: string): Order | undefined => {
    return orders.find((order) => order.id === orderId);
  };

  return (
    <OrdersContext.Provider
      value={{
        orders,
        createOrder,
        updateOrderStatus,
        getUserOrders,
        getAllOrders,
        getOrderById,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
};

