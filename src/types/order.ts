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
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string | null;
  rejectionComment?: string | null;
}

// Extended order with user profile info (for display)
export interface OrderWithUser extends Order {
  userEmail?: string;
  userRole?: 'user' | 'admin';
}
