import { useState, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { AppSidebar } from '@/components/AppSidebar';
import { FilterBar, FilterValues } from '@/components/FilterBar';
import { ExportActions } from '@/components/ExportActions';
import { InventoryTable } from '@/components/InventoryTable';
import { Footer } from '@/components/Footer';
import { inventoryData, InventoryItem } from '@/data/inventory';

const defaultFilters: FilterValues = {
  search: '',
  brand: 'all',
  grade: 'all',
  storage: 'all',
  priceRange: 'all',
};

export default function Inventory() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);

  const lastRefreshed = 'Jan 5, 2026 at 2:34 PM';

  const filteredItems = useMemo(() => {
    return inventoryData.filter((item: InventoryItem) => {
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
        <ExportActions />
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
