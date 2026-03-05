"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
  FilterBar,
  FilterValues,
  defaultFilters,
  buildServerFilters,
} from "@/components/FilterBar";
import { ExportActions } from "@/components/ExportActions";
import { InventoryTable } from "@/components/InventoryTable";
import { PaginationControls } from "@/components/PaginationControls";
import { AddProductModal } from "@/components/AddProductModal";
import { Loader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
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
  const [addProductOpen, setAddProductOpen] = useState(false);
  const filterOptions = useFilterOptions();
  const queryClient = useQueryClient();

  const debouncedSearch = useDebounce(filters.search);

  const serverFilters = buildServerFilters(debouncedSearch, filters);

  const [currentPage, setCurrentPage] = usePageParam();
  const queryKey = queryKeys.inventoryPage(currentPage, serverFilters);

  const filtersKey = JSON.stringify(serverFilters);

  const { data, totalCount, totalPages, isLoading, rangeText } =
    usePaginatedReactQuery<InventoryItem>({
      queryKey,
      fetchFn: (range) =>
        fetchPaginatedInventory(serverFilters, range, {
          includeAdminFields: true,
        }),
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
      <div className="sticky top-0 z-10 bg-background pb-3 space-y-3 border-b border-border mb-3 -mx-4 lg:-mx-6 px-4 lg:px-6 pt-3 lg:pt-4">
        {/* Page Header */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            Inventory
            <span className="text-muted-foreground font-normal text-sm ml-2">
              {totalCount} devices
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setAddProductOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
            <ExportActions
              onFetchAllData={() =>
                fetchAllFilteredInventory(serverFilters, {
                  includeAdminFields: true,
                })
              }
              filename="inventory"
            />
          </div>
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
        <InventoryTable
          items={data}
          className="h-full"
          hasActiveFilters={
            serverFilters.search !== "" ||
            serverFilters.brand !== "all" ||
            serverFilters.grade !== "all" ||
            serverFilters.storage !== "all" ||
            serverFilters.priceRange !== "all" ||
            serverFilters.stockStatus !== "all"
          }
        />
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

      <AddProductModal
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: queryKeys.inventory })
        }
      />
    </div>
  );
}
