import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { InventoryItem } from '@/data/inventory';
import { supabase } from '@/lib/supabase';

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

// Helper to convert database row to InventoryItem
const dbRowToInventoryItem = (row: any): InventoryItem => ({
  id: row.id,
  deviceName: row.deviceName,
  brand: row.brand,
  grade: row.grade as 'A' | 'B' | 'C',
  storage: row.storage,
  quantity: row.quantity,
  pricePerUnit: Number(row.pricePerUnit),
  lastUpdated: row.lastUpdated,
  priceChange: row.priceChange as 'up' | 'down' | 'stable' | undefined,
});

export const InventoryProvider = ({ children }: InventoryProviderProps) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load inventory from Supabase
  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('createdAt', { ascending: true });

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
      const updateData: any = {
        ...updates,
        lastUpdated: 'Just now',
        updatedAt: new Date().toISOString(),
      };

      // Convert pricePerUnit to number if present
      if (updateData.pricePerUnit !== undefined) {
        updateData.pricePerUnit = Number(updateData.pricePerUnit);
      }

      const { error } = await supabase
        .from('inventory')
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

      const { error } = await supabase
        .from('inventory')
        .update({
          quantity: newQuantity,
          lastUpdated: 'Just now',
          updatedAt: new Date().toISOString(),
        })
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

