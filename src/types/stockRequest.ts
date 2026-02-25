export type StockRequestStatus = "pending" | "fulfilled" | "cancelled";

export interface StockRequest {
  id: string;
  userId: string;
  inventoryItemId: string;
  quantity: number;
  note?: string | null;
  status: StockRequestStatus;
  adminMessage?: string | null;
  fulfilledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockRequestWithItem extends StockRequest {
  item: {
    id: string;
    deviceName: string;
    brand: string;
    grade: string;
    storage: string;
    quantity: number;
    sellingPrice: number;
  } | null;
}
