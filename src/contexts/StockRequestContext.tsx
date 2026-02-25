"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { StockRequest, StockRequestWithItem } from "@/types/stockRequest";

interface StockRequestContextType {
  /** Current user's pending requests, keyed by inventory_item_id */
  userRequestMap: Record<string, StockRequest>;
  /** All requests (pending + fulfilled) with inventory item details */
  allUserRequests: StockRequestWithItem[];
  /** Fulfilled requests the user hasn't acknowledged yet */
  newlyFulfilledCount: number;
  markFulfilledSeen: () => void;
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
    adminMessage: row.admin_message ?? null,
    fulfilledAt: row.fulfilled_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToRequestWithItem(row: any): StockRequestWithItem {
  const base = rowToRequest(row);
  const inv = row.inventory ?? null;
  return {
    ...base,
    item: inv
      ? {
          id: inv.id,
          deviceName: inv.device_name,
          brand: inv.brand,
          grade: inv.grade,
          storage: inv.storage,
          quantity: inv.quantity,
          sellingPrice: inv.selling_price ?? 0,
        }
      : null,
  };
}

export function StockRequestProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [userRequestMap, setUserRequestMap] = useState<
    Record<string, StockRequest>
  >({});
  const [allUserRequests, setAllUserRequests] = useState<
    StockRequestWithItem[]
  >([]);
  const [newlyFulfilledCount, setNewlyFulfilledCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Track fulfilled IDs we already counted to avoid double-counting
  const knownFulfilledIds = useRef<Set<string>>(new Set());

  const loadRequests = useCallback(async () => {
    if (!user) {
      setUserRequestMap({});
      setAllUserRequests([]);
      knownFulfilledIds.current = new Set();
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await (supabase.from("stock_requests") as any)
        .select(
          `id, user_id, inventory_item_id, quantity, note, status,
           admin_message, fulfilled_at, created_at, updated_at,
           inventory:inventory_item_id (id, device_name, brand, grade, storage, quantity, selling_price)`
        )
        .eq("user_id", user.id)
        .in("status", ["pending", "fulfilled"])
        .order("created_at", { ascending: false });

      if (!error && data) {
        const all: StockRequestWithItem[] = data.map(rowToRequestWithItem);
        setAllUserRequests(all);

        // Pending map (for product cards)
        const map: Record<string, StockRequest> = {};
        for (const row of all) {
          if (row.status === "pending") {
            map[row.inventoryItemId] = row;
          }
        }
        setUserRequestMap(map);

        // Count newly fulfilled requests we haven't seen before
        const newFulfilled = all.filter(
          (r) =>
            r.status === "fulfilled" && !knownFulfilledIds.current.has(r.id)
        );
        if (newFulfilled.length > 0) {
          setNewlyFulfilledCount((prev) => prev + newFulfilled.length);
          newFulfilled.forEach((r) => knownFulfilledIds.current.add(r.id));
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Real-time subscription: watch for admin fulfilling the user's requests
  useEffect(() => {
    if (!user) return;

    const channel = (supabase as any)
      .channel(`stock-requests-user-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "stock_requests",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (
            payload.new?.status === "fulfilled" &&
            !knownFulfilledIds.current.has(payload.new.id)
          ) {
            // Reload to get the full item details + admin message
            loadRequests();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadRequests]);

  const markFulfilledSeen = useCallback(() => {
    setNewlyFulfilledCount(0);
  }, []);

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
            admin_message: null,
            fulfilled_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,inventory_item_id" }
        )
        .select()
        .single();

      if (error) throw error;

      const req = rowToRequest(data);
      setUserRequestMap((prev) => ({
        ...prev,
        [inventoryItemId]: req,
      }));

      // Reload all to keep allUserRequests in sync
      await loadRequests();
    },
    [user, loadRequests]
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

      setAllUserRequests((prev) =>
        prev.filter((r) => r.inventoryItemId !== inventoryItemId)
      );
    },
    [user, userRequestMap]
  );

  return (
    <StockRequestContext.Provider
      value={{
        userRequestMap,
        allUserRequests,
        newlyFulfilledCount,
        markFulfilledSeen,
        createRequest,
        cancelRequest,
        isLoading,
      }}
    >
      {children}
    </StockRequestContext.Provider>
  );
}
