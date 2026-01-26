"use client";

import { useState, useMemo } from "react";
import { FilterBar, FilterValues } from "@/components/FilterBar";
import { ExportActions } from "@/components/ExportActions";
import { InventoryTable } from "@/components/InventoryTable";
import { Loader } from "@/components/Loader";
import { useInventory } from "@/contexts/InventoryContext";
import { InventoryItem, getStockStatus } from "@/data/inventory";

const defaultFilters: FilterValues = {
  search: "",
  brand: "all",
  grade: "all",
  storage: "all",
  priceRange: "all",
  stockStatus: "all",
};

export default function Inventory() {
  const { inventory, isLoading } = useInventory();
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);

  // Extract unique brands and storage options from inventory
  const availableBrands = useMemo(() => {
    const brands = new Set(inventory.map((item) => item.brand));
    return Array.from(brands).sort();
  }, [inventory]);

  const availableStorage = useMemo(() => {
    const storage = new Set(inventory.map((item) => item.storage));
    return Array.from(storage).sort((a, b) => {
      // Sort by numeric value if possible (e.g., "128GB" vs "256GB")
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });
  }, [inventory]);

  const filteredItems = useMemo(() => {
    return inventory.filter((item: InventoryItem) => {
      if (
        filters.search &&
        !item.deviceName.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      if (filters.brand !== "all" && item.brand !== filters.brand) {
        return false;
      }
      if (filters.grade !== "all" && item.grade !== filters.grade) {
        return false;
      }
      if (filters.storage !== "all" && item.storage !== filters.storage) {
        return false;
      }
      if (filters.priceRange !== "all") {
        switch (filters.priceRange) {
          case "under200":
            if (item.pricePerUnit >= 200) return false;
            break;
          case "200-400":
            if (item.pricePerUnit < 200 || item.pricePerUnit > 400)
              return false;
            break;
          case "400+":
            if (item.pricePerUnit < 400) return false;
            break;
        }
      }
      if (filters.stockStatus !== "all") {
        const stockStatus = getStockStatus(item.quantity);
        if (stockStatus !== filters.stockStatus) return false;
      }
      return true;
    });
  }, [filters, inventory]);

  const handleResetFilters = () => {
    setFilters(defaultFilters);
  };

  if (isLoading) {
    return <Loader size="lg" text="Loading inventory..." />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-10 bg-background pb-4 space-y-4 border-b border-border mb-4 -mx-4 lg:-mx-6 px-4 lg:px-6 pt-4 lg:pt-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Inventory
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredItems.length} devices in stock
            </p>
          </div>
          <ExportActions data={filteredItems} filename="inventory" />
        </div>

        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          onReset={handleResetFilters}
          brands={availableBrands}
          storageOptions={availableStorage}
        />
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 -mx-4 lg:-mx-6 px-4 lg:px-6">
        <div className="relative">
          <InventoryTable items={filteredItems} />
        </div>
      </div>
    </div>
  );
}
