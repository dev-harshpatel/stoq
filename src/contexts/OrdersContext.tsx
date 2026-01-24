'use client'

import { Database, Json } from "@/lib/database.types";
import { supabase } from "@/lib/supabase/client";
import { Order, OrderItem, OrderStatus } from "@/types/order";
import { ReactNode, createContext, useContext, useEffect, useState } from "react";

interface OrdersContextType {
  orders: Order[];
  createOrder: (userId: string, items: OrderItem[]) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  getUserOrders: (userId: string) => Order[];
  getAllOrders: () => Order[];
  getOrderById: (orderId: string) => Order | undefined;
  refreshOrders: () => Promise<void>;
  isLoading: boolean;
}

export const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

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

type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];

const dbRowToOrder = (row: OrderRow): Order => {
  // Parse items from JSON - handle string, object, or array
  let items: OrderItem[] = [];
  
  if (row.items) {
    try {
      // If items is a string, parse it
      if (typeof row.items === 'string') {
        const parsed = JSON.parse(row.items);
        items = Array.isArray(parsed) ? parsed : [parsed];
      } 
      // If items is already an array, use it directly
      else if (Array.isArray(row.items)) {
        items = row.items as unknown as OrderItem[];
      }
      // If items is an object (but not array), check if it's a single item or needs conversion
      else if (typeof row.items === 'object' && row.items !== null) {
        // Check if it has properties that suggest it's a single OrderItem
        if ('item' in row.items && 'quantity' in row.items) {
          items = [row.items as unknown as OrderItem];
        } 
        // Otherwise try to extract array from object values
        else {
          const values = Object.values(row.items);
          if (values.length > 0 && Array.isArray(values[0])) {
            items = values[0] as unknown as OrderItem[];
          } else {
            items = values.filter((v) =>
              typeof v === 'object' && v !== null && 'item' in v && 'quantity' in v
            ) as unknown as OrderItem[];
          }
        }
      }
    } catch (error) {
      items = [];
    }
  }

  // Validate that items array contains valid OrderItems
  items = items.filter((item): item is OrderItem => 
    item !== null && 
    typeof item === 'object' && 
    'item' in item && 
    'quantity' in item &&
    item.item !== null &&
    typeof item.item === 'object'
  );

  return {
    id: row.id,
    userId: row.user_id,
    items,
    totalPrice: Number(row.total_price),
    status: row.status as OrderStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const buildOrderInsert = (
  userId: string,
  items: OrderItem[]
): OrderInsert => {
  const totalPrice = items.reduce(
    (total, orderItem) => total + orderItem.item.pricePerUnit * orderItem.quantity,
    0
  );

  // Ensure items are properly formatted as JSON for Supabase
  // JSONB columns in Supabase accept plain JavaScript objects/arrays
  // No need to stringify - Supabase handles serialization
  const itemsJson: Json = items as unknown as Json;

  // Generate UUID v4 for order ID
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  return {
    id: generateUUID(),
    user_id: userId,
    items: itemsJson,
    total_price: totalPrice,
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const OrdersProvider = ({ children }: OrdersProviderProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load orders from Supabase
  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Don't return early - set empty array so UI shows no orders
        setOrders([]);
        return;
      }

      if (data) {
        const orderItems = data.map(dbRowToOrder);
        setOrders(orderItems);
      } else {
        setOrders([]);
      }
    } catch (error) {
      setOrders([]);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeOrders = async () => {
      setIsLoading(true);
      await loadOrders();
      // Only update loading state if component is still mounted
      if (isMounted) {
        setIsLoading(false);
      }
    };

    initializeOrders();

    // Set up real-time subscription
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          // Reload orders when changes occur (don't set loading state for real-time updates)
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const createOrder = async (userId: string, items: OrderItem[]): Promise<Order> => {
    if (!items || items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    const newOrder = buildOrderInsert(userId, items);

    try {
      // Use the newOrder directly - Supabase will handle JSON serialization
      const { data, error } = await (supabase
        .from('orders') as any)
        .insert([newOrder])
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to create order');
      }

      if (data) {
        const createdOrder = dbRowToOrder(data);
        setOrders((prev) => [createdOrder, ...prev]);
        return createdOrder;
      }

      return {
        id: newOrder.id ?? "",
        userId: newOrder.user_id,
        items,
        totalPrice: Number(newOrder.total_price),
        status: (newOrder.status ?? 'pending') as OrderStatus,
        createdAt: newOrder.created_at ?? new Date().toISOString(),
        updatedAt: newOrder.updated_at ?? new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const updateData: OrderUpdate = {
        status,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await (supabase
        .from('orders') as any)
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Reload orders from database to ensure we have the latest data
      // This ensures the UI matches the database state
      await loadOrders();
    } catch (error) {
      throw error;
    }
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
        refreshOrders: loadOrders,
        isLoading,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
};

