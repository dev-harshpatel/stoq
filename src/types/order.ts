import { InventoryItem } from "@/data/inventory";

export type OrderStatus = "pending" | "approved" | "rejected" | "completed";

export interface OrderItem {
  item: InventoryItem;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  username: string;
  items: OrderItem[];
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

