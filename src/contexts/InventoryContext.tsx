import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { InventoryItem } from '@/data/inventory';

interface InventoryContextType {
  inventory: InventoryItem[];
  updateProduct: (id: string, updates: Partial<InventoryItem>) => void;
  decreaseQuantity: (id: string, amount: number) => void;
  resetInventory: () => void;
  isLoading: boolean;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

interface InventoryProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'stoq-inventory';
const JSON_PATH = '/data/inventory.json';

const loadInventoryFromStorage = (): InventoryItem[] | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load inventory from storage:', error);
  }
  return null;
};

const saveInventoryToStorage = (inventory: InventoryItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
  } catch (error) {
    console.error('Failed to save inventory to storage:', error);
  }
};

const loadInventoryFromJSON = async (): Promise<InventoryItem[]> => {
  try {
    const response = await fetch(JSON_PATH);
    if (!response.ok) {
      throw new Error('Failed to load inventory JSON');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to load inventory from JSON:', error);
    return [];
  }
};

export const InventoryProvider = ({ children }: InventoryProviderProps) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeInventory = async () => {
      setIsLoading(true);
      
      // First, try to load from localStorage (persisted changes)
      const storedInventory = loadInventoryFromStorage();
      
      if (storedInventory && storedInventory.length > 0) {
        // Use stored inventory if available
        setInventory(storedInventory);
        setIsLoading(false);
      } else {
        // Otherwise, load from JSON file
        const jsonInventory = await loadInventoryFromJSON();
        setInventory(jsonInventory);
        saveInventoryToStorage(jsonInventory);
        setIsLoading(false);
      }
    };

    initializeInventory();
  }, []);

  // Sync inventory changes to localStorage
  useEffect(() => {
    if (inventory.length > 0) {
      saveInventoryToStorage(inventory);
    }
  }, [inventory]);

  const updateProduct = (id: string, updates: Partial<InventoryItem>) => {
    setInventory((prev) => {
      const updated = prev.map((item) =>
        item.id === id
          ? { ...item, ...updates, lastUpdated: 'Just now' }
          : item
      );
      return updated;
    });
  };

  const decreaseQuantity = (id: string, amount: number) => {
    setInventory((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const newQuantity = Math.max(0, item.quantity - amount);
          return {
            ...item,
            quantity: newQuantity,
            lastUpdated: 'Just now',
          };
        }
        return item;
      });
      return updated;
    });
  };

  const resetInventory = async () => {
    setIsLoading(true);
    const jsonInventory = await loadInventoryFromJSON();
    setInventory(jsonInventory);
    saveInventoryToStorage(jsonInventory);
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

