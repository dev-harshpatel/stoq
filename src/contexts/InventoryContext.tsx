'use client'

import { InventoryItem } from '@/data/inventory';
import { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase/client';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

interface InventoryContextType {
  inventory: InventoryItem[];
  updateProduct: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  decreaseQuantity: (id: string, amount: number) => Promise<void>;
  resetInventory: () => Promise<void>;
  isLoading: boolean;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

interface InventoryProviderProps {
  children: ReactNode;
}

type InventoryRow = Database['public']['Tables']['inventory']['Row'];
type InventoryUpdate = Database['public']['Tables']['inventory']['Update'];

const dbRowToInventoryItem = (row: InventoryRow): InventoryItem => ({
  id: row.id,
  deviceName: row.device_name,
  brand: row.brand,
  grade: row.grade as 'A' | 'B' | 'C',
  storage: row.storage,
  quantity: row.quantity,
  pricePerUnit: Number(row.price_per_unit),
  lastUpdated: row.last_updated,
  priceChange: (row.price_change ?? undefined) as 'up' | 'down' | 'stable' | undefined,
});

const toInventoryUpdate = (updates: Partial<InventoryItem>): InventoryUpdate => {
  const updateData: InventoryUpdate = {};

  if (updates.brand !== undefined) updateData.brand = updates.brand;
  if (updates.deviceName !== undefined) updateData.device_name = updates.deviceName;
  if (updates.grade !== undefined) updateData.grade = updates.grade;
  if (updates.lastUpdated !== undefined) updateData.last_updated = updates.lastUpdated;
  if (updates.priceChange !== undefined) updateData.price_change = updates.priceChange ?? null;
  if (updates.pricePerUnit !== undefined) {
    updateData.price_per_unit = Number(updates.pricePerUnit);
  }
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
  if (updates.storage !== undefined) updateData.storage = updates.storage;

  return updateData;
};

export const InventoryProvider = ({ children }: InventoryProviderProps) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load inventory from Supabase
  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading inventory:', error);
        return;
      }

      if (data) {
        const inventoryItems = data.map(dbRowToInventoryItem);
        setInventory(inventoryItems);
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
    }
  };

  useEffect(() => {
    const initializeInventory = async () => {
      setIsLoading(true);
      await loadInventory();
      setIsLoading(false);
    };

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
      supabase.removeChannel(channel);
    };
  }, []);

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
        console.error('Error updating product:', error);
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
      console.error('Failed to update product:', error);
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
        console.error('Error decreasing quantity:', error);
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
      console.error('Failed to decrease quantity:', error);
      throw error;
    }
  };

  const resetInventory = async () => {
    setIsLoading(true);
    await loadInventory();
    setIsLoading(false);
  };

  return (
    <InventoryContext.Provider
      value={{ inventory, updateProduct, decreaseQuantity, resetInventory, isLoading }}
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

