import { InventoryItem } from "@/data/inventory";

export type OrderStatus = "pending" | "approved" | "rejected" | "completed";

export interface OrderItem {
  item: InventoryItem;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  taxRate: number | null;
  taxAmount: number | null;
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string | null;
  rejectionComment?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  poNumber?: string | null;
  paymentTerms?: string | null;
  dueDate?: string | null;
  hstNumber?: string | null;
  invoiceNotes?: string | null;
  invoiceTerms?: string | null;
  invoiceConfirmed?: boolean;
  invoiceConfirmedAt?: string | null;
  discountAmount?: number;
  discountType?: 'percentage' | 'cad';
  shippingAmount?: number;
}

// Extended order with user profile info (for display)
export interface OrderWithUser extends Order {
  userEmail?: string;
  userRole?: 'user' | 'admin';
}
