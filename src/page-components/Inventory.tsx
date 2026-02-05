"use client";

import { useState, useEffect, useCallback } from "react";
import { FilterBar, FilterValues } from "@/components/FilterBar";
import { ExportActions } from "@/components/ExportActions";
import { InventoryTable } from "@/components/InventoryTable";
import { PaginationControls } from "@/components/PaginationControls";
import { Loader } from "@/components/Loader";
import { InventoryItem } from "@/data/inventory";
import { useDebounce } from "@/hooks/use-debounce";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import {
  fetchPaginatedInventory,
  fetchFilterOptions,
  fetchAllFilteredInventory,
  InventoryFilters,
} from "@/lib/supabase/queries";

const defaultFilters: FilterValues = {
  search: "",
  brand: "all",
  grade: "all",
  storage: "all",
  priceRange: "all",
  stockStatus: "all",
};

export default function Inventory() {
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const [filterOptions, setFilterOptions] = useState<{
    brands: string[];
    storageOptions: string[];
  }>({ brands: [], storageOptions: [] });

  const debouncedSearch = useDebounce(filters.search, 300);

  // Load filter dropdown options once on mount
  useEffect(() => {
    fetchFilterOptions().then(setFilterOptions);
  }, []);

  const serverFilters: InventoryFilters = {
    search: debouncedSearch,
    brand: filters.brand,
    grade: filters.grade,
    storage: filters.storage,
    priceRange: filters.priceRange,
    stockStatus: filters.stockStatus,
  };

  const fetchFn = useCallback(
    async (range: { from: number; to: number }) => {
      return fetchPaginatedInventory(serverFilters, range);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedSearch, filters.brand, filters.grade, filters.storage, filters.priceRange, filters.stockStatus]
  );

  const {
    data,
    totalCount,
    currentPage,
    totalPages,
    isLoading,
    setCurrentPage,
    rangeText,
  } = usePaginatedQuery<InventoryItem>({
    fetchFn,
    dependencies: [debouncedSearch, filters.brand, filters.grade, filters.storage, filters.priceRange, filters.stockStatus],
    realtimeTable: "inventory",
  });

  const handleResetFilters = () => {
    setFilters(defaultFilters);
  };

  if (isLoading && data.length === 0) {
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
              {totalCount} devices in stock
            </p>
          </div>
          <ExportActions
            onFetchAllData={() => fetchAllFilteredInventory(serverFilters)}
            filename="inventory"
          />
        </div>

        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          onReset={handleResetFilters}
          brands={filterOptions.brands}
          storageOptions={filterOptions.storageOptions}
        />
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 -mx-4 lg:-mx-6 px-4 lg:px-6">
        <div className="relative">
          <InventoryTable items={data} />
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            rangeText={rangeText}
          />
        </div>
      </div>
    </div>
  );
}
