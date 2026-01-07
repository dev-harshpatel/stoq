import { useState, useMemo } from 'react';
import { FilterBar, FilterValues } from '@/components/FilterBar';
import { ExportActions } from '@/components/ExportActions';
import { InventoryTable } from '@/components/InventoryTable';
import { useInventory } from '@/contexts/InventoryContext';
import { InventoryItem } from '@/data/inventory';

const defaultFilters: FilterValues = {
  search: '',
  brand: 'all',
  grade: 'all',
  storage: 'all',
  priceRange: 'all',
};

export default function Inventory() {
  const { inventory, isLoading } = useInventory();
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);

  const filteredItems = useMemo(() => {
    return inventory.filter((item: InventoryItem) => {
      if (
        filters.search &&
        !item.deviceName.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      if (filters.brand !== 'all' && item.brand !== filters.brand) {
        return false;
      }
      if (filters.grade !== 'all' && item.grade !== filters.grade) {
        return false;
      }
      if (filters.storage !== 'all' && item.storage !== filters.storage) {
        return false;
      }
      if (filters.priceRange !== 'all') {
        switch (filters.priceRange) {
          case 'under200':
            if (item.pricePerUnit >= 200) return false;
            break;
          case '200-400':
            if (item.pricePerUnit < 200 || item.pricePerUnit > 400) return false;
            break;
          case '400+':
            if (item.pricePerUnit < 400) return false;
            break;
        }
      }
      return true;
    });
  }, [filters]);

  const handleResetFilters = () => {
    setFilters(defaultFilters);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Inventory</h2>
            <p className="text-sm text-muted-foreground mt-1">Loading inventory...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Inventory</h2>
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
      />

      {/* Inventory Table */}
      <InventoryTable items={filteredItems} />
    </div>
  );
}
