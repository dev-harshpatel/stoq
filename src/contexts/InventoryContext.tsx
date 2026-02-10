'use client'

import { InventoryItem } from '@/data/inventory';
import { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { useRefresh } from '@/contexts/RefreshContext';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { UploadHistory, BulkInsertResult } from '@/types/upload';
import { dbRowToInventoryItem } from '@/lib/supabase/queries';

interface InventoryContextType {
  inventory: InventoryItem[];
  updateProduct: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  decreaseQuantity: (id: string, amount: number) => Promise<void>;
  resetInventory: () => Promise<void>;
  refreshInventory: () => Promise<void>;
  bulkInsertProducts: (products: InventoryItem[]) => Promise<BulkInsertResult>;
  getUploadHistory: () => Promise<UploadHistory[]>;
  isLoading: boolean;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

interface InventoryProviderProps {
  children: ReactNode;
}

type InventoryUpdate = Database['public']['Tables']['inventory']['Update'];

export const toInventoryUpdate = (updates: Partial<InventoryItem>): InventoryUpdate => {
  const updateData: InventoryUpdate = {};

  if (updates.brand !== undefined) updateData.brand = updates.brand;
  if (updates.deviceName !== undefined) updateData.device_name = updates.deviceName;
  if (updates.grade !== undefined) updateData.grade = updates.grade;
  if (updates.lastUpdated !== undefined) updateData.last_updated = updates.lastUpdated;
  if (updates.priceChange !== undefined) updateData.price_change = updates.priceChange ?? null;
  if (updates.pricePerUnit !== undefined) {
    updateData.price_per_unit = Number(updates.pricePerUnit);
  }
  if (updates.purchasePrice !== undefined) {
    updateData.purchase_price = updates.purchasePrice != null ? Number(updates.purchasePrice) : null;
  }
  if (updates.hst !== undefined) {
    updateData.hst = updates.hst != null ? Number(updates.hst) : null;
  }
  if (updates.sellingPrice !== undefined) {
    updateData.selling_price = Number(updates.sellingPrice);
  }
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
  if (updates.storage !== undefined) updateData.storage = updates.storage;

  return updateData;
};

export const InventoryProvider = ({ children }: InventoryProviderProps) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { refreshKey } = useRefresh();

  // Load inventory from Supabase
  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        setInventory([]);
        return;
      }

      if (data) {
        const inventoryItems = data.map(dbRowToInventoryItem);
        setInventory(inventoryItems);
      } else {
        setInventory([]);
      }
    } catch (error) {
      setInventory([]);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeInventory = async () => {
      setIsLoading(true);
      await loadInventory();
      // Only update loading state if component is still mounted
      if (isMounted) {
        setIsLoading(false);
      }
    };

    // Initialize immediately
    initializeInventory();

    // Set up real-time subscription
    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
        },
        () => {
          // Reload inventory when changes occur
          loadInventory();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
    // Use user?.id to avoid re-fetching when user object reference changes but ID is the same
  }, [user?.id]);

  // Refresh inventory when RefreshContext triggers (auto-refresh or manual refresh)
  useEffect(() => {
    // Skip on initial mount (refreshKey starts at 0)
    if (refreshKey > 0) {
      loadInventory();
    }
  }, [refreshKey]);

  const updateProduct = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      const updateData: InventoryUpdate = toInventoryUpdate({
        ...updates,
        lastUpdated: 'Just now',
      });
      updateData.updated_at = new Date().toISOString();

      const { error } = await (supabase
        .from('inventory') as any)
        .update(updateData)
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Update local state
      setInventory((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, ...updates, lastUpdated: 'Just now' }
            : item
        )
      );
    } catch (error) {
      throw error;
    }
  };

  const decreaseQuantity = async (id: string, amount: number) => {
    try {
      const item = inventory.find((i) => i.id === id);
      if (!item) {
        throw new Error('Product not found');
      }

      const newQuantity = Math.max(0, item.quantity - amount);

      const updateData: InventoryUpdate = {
        quantity: newQuantity,
        last_updated: 'Just now',
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase
        .from('inventory') as any)
        .update(updateData)
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Update local state
      setInventory((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: newQuantity,
                lastUpdated: 'Just now',
              }
            : item
        )
      );
    } catch (error) {
      throw error;
    }
  };

  const resetInventory = async () => {
    setIsLoading(true);
    await loadInventory();
    setIsLoading(false);
  };

  // Silent refresh - doesn't show loading state (for auto-refresh)
  const refreshInventory = async () => {
    await loadInventory();
  };

  const bulkInsertProducts = async (products: InventoryItem[]): Promise<BulkInsertResult> => {
    if (!user?.id) {
      throw new Error('User must be authenticated to upload products');
    }

    const result: BulkInsertResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Insert products in batches of 50 to avoid timeouts
    const batchSize = 50;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      try {
        // Map to database format
        const insertData = batch.map((product) => {
          return {
            device_name: product.deviceName,
            brand: product.brand,
            grade: product.grade,
            storage: product.storage,
            quantity: product.quantity,
            price_per_unit: product.pricePerUnit,
            purchase_price: product.purchasePrice ?? null,
            hst: product.hst ?? null,
            selling_price: product.sellingPrice,
            last_updated: product.lastUpdated || 'Just now',
            price_change: product.priceChange ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        });

        const { data, error } = await (supabase
          .from('inventory') as any)
          .insert(insertData)
          .select();

        if (error) {
          // If batch fails, try inserting individually
          for (const product of batch) {
            try {
              const { error: individualError } = await (supabase
                .from('inventory') as any)
                .insert({
                  device_name: product.deviceName,
                  brand: product.brand,
                  grade: product.grade,
                  storage: product.storage,
                  quantity: product.quantity,
                  price_per_unit: product.pricePerUnit,
                  purchase_price: product.purchasePrice ?? null,
                  hst: product.hst ?? null,
                  selling_price: product.sellingPrice,
                  last_updated: product.lastUpdated || 'Just now',
                  price_change: product.priceChange ?? null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });

              if (individualError) {
                result.failed++;
                result.errors.push(
                  `${product.deviceName} ${product.storage}: ${individualError.message}`
                );
              } else {
                result.success++;
              }
            } catch (err) {
              result.failed++;
              result.errors.push(
                `${product.deviceName} ${product.storage}: ${err instanceof Error ? err.message : 'Unknown error'}`
              );
            }
          }
        } else {
          result.success += batch.length;
        }
      } catch (error) {
        result.failed += batch.length;
        result.errors.push(
          `Batch ${Math.floor(i / batchSize) + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Refresh inventory after bulk insert
    await loadInventory();

    return result;
  };

  const getUploadHistory = async (): Promise<UploadHistory[]> => {
    try {
      const { data, error } = await (supabase
        .from('product_uploads') as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!data) {
        return [];
      }

      return (data as any[]).map((row: any) => ({
        id: row.id,
        uploadedBy: row.uploaded_by,
        fileName: row.file_name,
        totalProducts: row.total_products,
        successfulInserts: row.successful_inserts,
        failedInserts: row.failed_inserts,
        uploadStatus: row.upload_status as 'pending' | 'completed' | 'failed',
        errorMessage: row.error_message ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      throw error;
    }
  };

  return (
    <InventoryContext.Provider
      value={{
        inventory,
        updateProduct,
        decreaseQuantity,
        resetInventory,
        refreshInventory,
        bulkInsertProducts,
        getUploadHistory,
        isLoading,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};

