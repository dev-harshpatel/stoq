export type StockRequestStatus = "pending" | "fulfilled" | "cancelled";

export interface StockRequest {
  id: string;
  userId: string;
  inventoryItemId: string;
  quantity: number;
  note?: string | null;
  status: StockRequestStatus;
  createdAt: string;
  updatedAt: string;
}
