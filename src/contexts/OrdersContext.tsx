"use client";

import { Database, Json } from "@/lib/database.types";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { useRealtimeContext } from "@/contexts/RealtimeContext";
import { Order, OrderItem, OrderStatus } from "@/types/order";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { dbRowToOrder } from "@/lib/supabase/queries";

export interface OrderAddresses {
  shippingAddress: string | null;
  billingAddress: string | null;
}

interface OrdersContextType {
  orders: Order[];
  createOrder: (
    userId: string,
    items: OrderItem[],
    subtotal?: number,
    taxRate?: number,
    taxAmount?: number,
    addresses?: OrderAddresses
  ) => Promise<Order>;
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    rejectionReason?: string,
    rejectionComment?: string,
    discountAmount?: number
  ) => Promise<void>;
  updateInvoice: (
    orderId: string,
    invoiceData: {
      invoiceNumber: string;
      invoiceDate: string;
      poNumber: string;
      paymentTerms: string;
      dueDate: string;
      hstNumber: string;
      invoiceNotes?: string | null;
      invoiceTerms?: string | null;
      discountAmount?: number;
      discountType?: string;
      shippingAmount?: number;
    }
  ) => Promise<void>;
  confirmInvoice: (orderId: string) => Promise<void>;
  downloadInvoicePDF: (orderId: string) => Promise<void>;
  getUserOrders: (userId: string) => Order[];
  getAllOrders: () => Order[];
  getOrderById: (orderId: string) => Order | undefined;
  refreshOrders: () => Promise<void>;
  isLoading: boolean;
}

export const OrdersContext = createContext<OrdersContextType | undefined>(
  undefined
);

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
type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];

const buildOrderInsert = (
  userId: string,
  items: OrderItem[],
  subtotal?: number,
  taxRate?: number,
  taxAmount?: number,
  addresses?: OrderAddresses
): OrderInsert => {
  // Calculate subtotal if not provided
  const calculatedSubtotal =
    subtotal ??
    items.reduce(
      (total, orderItem) =>
        total +
        (orderItem.item.sellingPrice ?? orderItem.item.pricePerUnit) *
          orderItem.quantity,
      0
    );

  // Calculate tax amount if not provided but tax rate is
  const calculatedTaxAmount =
    taxAmount ??
    (taxRate ? Math.round(calculatedSubtotal * taxRate * 100) / 100 : 0);

  // Total price includes tax
  const totalPrice = calculatedSubtotal + calculatedTaxAmount;

  // Ensure items are properly formatted as JSON for Supabase
  // JSONB columns in Supabase accept plain JavaScript objects/arrays
  // No need to stringify - Supabase handles serialization
  const itemsJson: Json = items as unknown as Json;

  // Generate UUID v4 for order ID
  const generateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  return {
    id: generateUUID(),
    user_id: userId,
    items: itemsJson,
    subtotal: calculatedSubtotal,
    tax_rate: taxRate ?? null,
    tax_amount: calculatedTaxAmount > 0 ? calculatedTaxAmount : null,
    total_price: totalPrice,
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Addresses
    shipping_address: addresses?.shippingAddress ?? null,
    billing_address: addresses?.billingAddress ?? null,
  };
};

export const OrdersProvider = ({ children }: OrdersProviderProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { ordersVersion } = useRealtimeContext();

  // Load orders from Supabase
  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // Log error for debugging but don't throw
        // Set empty array so UI shows no orders
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
      // On error, set empty array
      setOrders([]);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeOrders = async () => {
      setIsLoading(true);
      await loadOrders();
      if (isMounted) {
        setIsLoading(false);
      }
    };

    initializeOrders();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Reload orders when RealtimeProvider signals orders changes
  useEffect(() => {
    if (ordersVersion > 0) {
      loadOrders();
    }
  }, [ordersVersion]);

  const createOrder = async (
    userId: string,
    items: OrderItem[],
    subtotal?: number,
    taxRate?: number,
    taxAmount?: number,
    addresses?: OrderAddresses
  ): Promise<Order> => {
    if (!items || items.length === 0) {
      throw new Error("Order must have at least one item");
    }

    const newOrder = buildOrderInsert(
      userId,
      items,
      subtotal,
      taxRate,
      taxAmount,
      addresses
    );

    try {
      // Use the newOrder directly - Supabase will handle JSON serialization
      const { data, error } = await (supabase.from("orders") as any)
        .insert([newOrder])
        .select()
        .single();

      if (error) {
        throw new Error(error.message || "Failed to create order");
      }

      if (data) {
        const createdOrder = dbRowToOrder(data);
        setOrders((prev) => [createdOrder, ...prev]);
        return createdOrder;
      }

      const fallbackSubtotal =
        subtotal ??
        items.reduce(
          (total, orderItem) =>
            total +
            (orderItem.item.sellingPrice ?? orderItem.item.pricePerUnit) *
              orderItem.quantity,
          0
        );
      const fallbackTaxAmount =
        taxAmount ??
        (taxRate ? Math.round(fallbackSubtotal * taxRate * 100) / 100 : 0);
      const fallbackTotalPrice = fallbackSubtotal + fallbackTaxAmount;

      return {
        id: newOrder.id ?? "",
        userId: newOrder.user_id,
        items,
        subtotal: Number((newOrder as any).subtotal ?? fallbackSubtotal),
        taxRate: (newOrder as any).tax_rate
          ? Number((newOrder as any).tax_rate)
          : taxRate ?? null,
        taxAmount: (newOrder as any).tax_amount
          ? Number((newOrder as any).tax_amount)
          : fallbackTaxAmount > 0
          ? fallbackTaxAmount
          : null,
        totalPrice: Number(newOrder.total_price ?? fallbackTotalPrice),
        status: (newOrder.status ?? "pending") as OrderStatus,
        createdAt: newOrder.created_at ?? new Date().toISOString(),
        updatedAt: newOrder.updated_at ?? new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
    rejectionReason?: string,
    rejectionComment?: string,
    discountAmount?: number
  ) => {
    try {
      const updateData: OrderUpdate = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Add discount if provided (only when approving)
      if (status === "approved" && discountAmount !== undefined) {
        (updateData as any).discount_amount = discountAmount;

        // Recalculate total price with discount
        const order = getOrderById(orderId);
        if (order) {
          const subtotal = order.subtotal;
          const taxAmount = order.taxAmount || 0;
          const newTotal = subtotal + taxAmount - discountAmount;
          (updateData as any).total_price = Math.max(0, newTotal); // Ensure total is not negative
        }
      }

      // Add rejection fields if rejecting
      if (status === "rejected") {
        (updateData as any).rejection_reason = rejectionReason || null;
        (updateData as any).rejection_comment = rejectionComment || null;
        // Clear discount when rejecting
        (updateData as any).discount_amount = 0;
      } else {
        // Clear rejection fields if status is not rejected
        (updateData as any).rejection_reason = null;
        (updateData as any).rejection_comment = null;
      }

      const { data, error } = await (supabase.from("orders") as any)
        .update(updateData)
        .eq("id", orderId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Reload orders from database to ensure we have the latest data
      await loadOrders();
    } catch (error) {
      throw error;
    }
  };

  const getUserOrders = (userId: string): Order[] => {
    return orders
      .filter((order) => order.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  };

  const getAllOrders = (): Order[] => {
    return [...orders].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const getOrderById = (orderId: string): Order | undefined => {
    return orders.find((order) => order.id === orderId);
  };

  const updateInvoice = async (
    orderId: string,
    invoiceData: {
      invoiceNumber: string;
      invoiceDate: string;
      poNumber: string;
      paymentTerms: string;
      dueDate: string;
      hstNumber: string;
      invoiceNotes?: string | null;
      invoiceTerms?: string | null;
      discountAmount?: number;
      discountType?: string;
      shippingAmount?: number;
    }
  ): Promise<void> => {
    try {
      const order = getOrderById(orderId);
      if (!order) {
        throw new Error("Order not found");
      }

      const discountAmount = invoiceData.discountAmount || 0;
      const shippingAmount = invoiceData.shippingAmount || 0;
      const subtotal = order.subtotal;
      const taxRate = order.taxRate || 0;

      // New calculation formula:
      // 1. Result = subtotal - discount + shipping
      // 2. Tax = result * taxRate (tax applied to result, not subtotal)
      // 3. Total = result + tax
      const result = subtotal - discountAmount + shippingAmount;
      const newTaxAmount = result * taxRate;
      const newTotal = Math.max(0, result + newTaxAmount);

      const updateData: OrderUpdate = {
        invoice_number: invoiceData.invoiceNumber,
        invoice_date: invoiceData.invoiceDate,
        po_number: invoiceData.poNumber,
        payment_terms: invoiceData.paymentTerms,
        due_date: invoiceData.dueDate,
        hst_number: invoiceData.hstNumber,
        invoice_notes: invoiceData.invoiceNotes ?? null,
        invoice_terms: invoiceData.invoiceTerms ?? null,
        discount_amount: discountAmount,
        discount_type: invoiceData.discountType || "cad",
        shipping_amount: shippingAmount,
        tax_amount: newTaxAmount, // Update tax amount to reflect tax on result
        total_price: newTotal, // Update total with new formula
        invoice_confirmed: false, // Reset confirmation when updating
        invoice_confirmed_at: null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase.from("orders") as any)
        .update(updateData)
        .eq("id", orderId);

      if (error) {
        throw error;
      }

      // Reload orders to get updated data
      await loadOrders();
    } catch (error) {
      throw error;
    }
  };

  const confirmInvoice = async (orderId: string): Promise<void> => {
    try {
      const updateData: OrderUpdate = {
        invoice_confirmed: true,
        invoice_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase.from("orders") as any)
        .update(updateData)
        .eq("id", orderId);

      if (error) {
        throw error;
      }

      // Reload orders to get updated data
      await loadOrders();
    } catch (error) {
      throw error;
    }
  };

  const downloadInvoicePDF = async (orderId: string): Promise<void> => {
    try {
      // Fetch fresh order data from database to ensure we have the latest invoice info
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError || !orderData) {
        throw new Error("Order not found");
      }

      const order = dbRowToOrder(orderData);

      if (!order.invoiceNumber) {
        throw new Error("Invoice not created yet");
      }

      // Import PDF generation function
      const { generateInvoicePDF } = await import("@/lib/invoicePdfUtils");
      const { getUserProfile } = await import("@/lib/supabase/utils");

      // Get customer info
      const customerProfile = await getUserProfile(order.userId);

      // Prepare invoice data
      const invoiceData = {
        invoiceNumber: order.invoiceNumber,
        invoiceDate: order.invoiceDate || order.createdAt,
        poNumber: order.poNumber || "",
        paymentTerms: order.paymentTerms || "CHQ",
        dueDate: order.dueDate || order.createdAt,
        hstNumber: order.hstNumber || "",
        invoiceNotes: order.invoiceNotes,
        invoiceTerms: order.invoiceTerms,
      };

      // Generate and download PDF
      await generateInvoicePDF(order, invoiceData, {
        businessName: customerProfile?.businessName || null,
        businessAddress: customerProfile?.businessAddress || null,
      });
    } catch (error) {
      throw error;
    }
  };

  return (
    <OrdersContext.Provider
      value={{
        orders,
        createOrder,
        updateOrderStatus,
        updateInvoice,
        confirmInvoice,
        downloadInvoicePDF,
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
