"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { StockRequest } from "@/types/stockRequest";

interface StockRequestContextType {
  /** Current user's pending requests, keyed by inventory_item_id */
  userRequestMap: Record<string, StockRequest>;
  createRequest: (
    inventoryItemId: string,
    quantity: number,
    note?: string
  ) => Promise<void>;
  cancelRequest: (inventoryItemId: string) => Promise<void>;
  isLoading: boolean;
}

const StockRequestContext = createContext<StockRequestContextType | undefined>(
  undefined
);

export function useStockRequests() {
  const ctx = useContext(StockRequestContext);
  if (!ctx)
    throw new Error(
      "useStockRequests must be used within StockRequestProvider"
    );
  return ctx;
}

function rowToRequest(row: any): StockRequest {
  return {
    id: row.id,
    userId: row.user_id,
    inventoryItemId: row.inventory_item_id,
    quantity: row.quantity,
    note: row.note ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function StockRequestProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [userRequestMap, setUserRequestMap] = useState<
    Record<string, StockRequest>
  >({});
  const [isLoading, setIsLoading] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!user) {
      setUserRequestMap({});
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await (supabase.from("stock_requests") as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (!error && data) {
        const map: Record<string, StockRequest> = {};
        for (const row of data) {
          map[row.inventory_item_id] = rowToRequest(row);
        }
        setUserRequestMap(map);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const createRequest = useCallback(
    async (inventoryItemId: string, quantity: number, note?: string) => {
      if (!user) throw new Error("Must be logged in to request stock");

      const { data, error } = await (supabase.from("stock_requests") as any)
        .upsert(
          {
            user_id: user.id,
            inventory_item_id: inventoryItemId,
            quantity,
            note: note || null,
            status: "pending",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,inventory_item_id" }
        )
        .select()
        .single();

      if (error) throw error;

      setUserRequestMap((prev) => ({
        ...prev,
        [inventoryItemId]: rowToRequest(data),
      }));
    },
    [user]
  );

  const cancelRequest = useCallback(
    async (inventoryItemId: string) => {
      if (!user) throw new Error("Must be logged in");

      const request = userRequestMap[inventoryItemId];
      if (!request) return;

      const { error } = await (supabase.from("stock_requests") as any)
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", request.id);

      if (error) throw error;

      setUserRequestMap((prev) => {
        const next = { ...prev };
        delete next[inventoryItemId];
        return next;
      });
    },
    [user, userRequestMap]
  );

  return (
    <StockRequestContext.Provider
      value={{ userRequestMap, createRequest, cancelRequest, isLoading }}
    >
      {children}
    </StockRequestContext.Provider>
  );
}
