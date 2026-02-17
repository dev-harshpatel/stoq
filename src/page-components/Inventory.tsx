"use client";

import { useState } from "react";
import {
  FilterBar,
  FilterValues,
  defaultFilters,
  buildServerFilters,
} from "@/components/FilterBar";
import { ExportActions } from "@/components/ExportActions";
import { InventoryTable } from "@/components/InventoryTable";
import { PaginationControls } from "@/components/PaginationControls";
import { Loader } from "@/components/Loader";
import { InventoryItem } from "@/data/inventory";
import { useDebounce } from "@/hooks/use-debounce";
import { usePaginatedReactQuery } from "@/hooks/use-paginated-react-query";
import { usePageParam } from "@/hooks/use-page-param";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchPaginatedInventory,
  fetchAllFilteredInventory,
} from "@/lib/supabase/queries";
import { useFilterOptions } from "@/hooks/use-filter-options";

export default function Inventory() {
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const filterOptions = useFilterOptions();

  const debouncedSearch = useDebounce(filters.search);

  const serverFilters = buildServerFilters(debouncedSearch, filters);

  const [currentPage, setCurrentPage] = usePageParam();
  const queryKey = queryKeys.inventoryPage(currentPage, serverFilters);

  const filtersKey = JSON.stringify(serverFilters);

  const { data, totalCount, totalPages, isLoading, rangeText } =
    usePaginatedReactQuery<InventoryItem>({
      queryKey,
      fetchFn: (range) => fetchPaginatedInventory(serverFilters, range),
      currentPage,
      setCurrentPage,
      filtersKey,
    });

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

      {/* Content Area */}
      <div className="flex-1 min-h-0 -mx-4 lg:-mx-6 px-4 lg:px-6">
        <InventoryTable items={data} className="h-full" />
      </div>

      {/* Pagination - Sticky at bottom so it stays visible when scrolling on mobile */}
      <div className="flex-shrink-0 sticky bottom-0 z-10 bg-background border-t border-border -mx-4 lg:-mx-6 px-4 lg:px-6 py-2">
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          rangeText={rangeText}
        />
      </div>
    </div>
  );
}
