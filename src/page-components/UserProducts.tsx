"use client";

import { useState, useEffect, useCallback } from "react";
import { ShoppingCart, FileText, Heart } from "lucide-react";
import { useWishlist } from "@/contexts/WishlistContext";
import { useRefresh } from "@/contexts/RefreshContext";
import { InventoryItem, formatPrice, getStockStatus } from "@/data/inventory";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterValues } from "@/components/FilterBar";
import { PurchaseModal } from "@/components/PurchaseModal";
import { GradeBadge } from "@/components/GradeBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { PriceChangeIndicator } from "@/components/PriceChangeIndicator";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { PaginationControls } from "@/components/PaginationControls";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import {
  fetchPaginatedInventory,
  fetchFilterOptions,
  fetchAllFilteredInventory,
  InventoryFilters,
} from "@/lib/supabase/queries";
import { exportToPDF } from "@/lib/exportUtils";

const defaultFilters: FilterValues = {
  search: "",
  brand: "all",
  grade: "all",
  storage: "all",
  priceRange: "all",
  stockStatus: "all",
};

export default function UserProducts() {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { refreshKey } = useRefresh();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const [filterOptions, setFilterOptions] = useState<{
    brands: string[];
    storageOptions: string[];
  }>({ brands: [], storageOptions: [] });

  const debouncedSearch = useDebounce(filters.search, 300);

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
    data: filteredItems,
    totalCount,
    currentPage,
    totalPages,
    isLoading,
    isFetching,
    setCurrentPage,
    rangeText,
  } = usePaginatedQuery<InventoryItem>({
    fetchFn,
    dependencies: [debouncedSearch, filters.brand, filters.grade, filters.storage, filters.priceRange, filters.stockStatus],
    refreshKey,
    // Note: realtimeTable removed to prevent double-fetching with RefreshContext
  });

  const handleBuyClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setPurchaseModalOpen(true);
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
  };

  const handleExportPDF = async () => {
    try {
      const allItems = await fetchAllFilteredInventory(serverFilters);
      if (allItems.length === 0) {
        toast.error("No data to export", {
          description: "Please ensure there are items to export",
        });
        return;
      }
      exportToPDF(allItems, "inventory");
      toast.success("Export successful", {
        description: "Your PDF file has been downloaded",
      });
    } catch (error) {
      toast.error("Export failed", {
        description: "There was an error exporting to PDF",
      });
    }
  };

  if (isLoading) {
    return <Loader size="lg" text="Loading products..." />;
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header Section - Sticky on desktop only */}
        <div className="lg:sticky lg:top-0 z-10 bg-background pb-4 space-y-4 border-b border-border mb-4">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Products
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {totalCount} devices available
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">Download PDF</span>
            </Button>
          </div>

          {/* Filter Bar */}
          <FilterBar
            brands={filterOptions.brands}
            storageOptions={filterOptions.storageOptions}
            filters={filters}
            onFiltersChange={setFilters}
            onReset={handleResetFilters}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0">
          {/* Desktop Table */}
          <div className="hidden md:flex md:flex-col rounded-lg border border-border bg-card h-full overflow-hidden">
            {/* Fixed Header */}
            <div className="flex-shrink-0 bg-muted border-b border-border">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4 w-[22%]">
                      Device Name
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4 w-[10%]">
                      Brand
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4 w-[8%]">
                      Grade
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4 w-[10%]">
                      Storage
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4 w-[8%]">
                      Qty
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4 w-[12%]">
                      Price/Unit
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4 w-[12%]">
                      Status
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4 w-[18%]">
                      Action
                    </th>
                  </tr>
                </thead>
              </table>
            </div>
            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <table className="w-full">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <tbody className="divide-y divide-border">
                  {filteredItems.map((item, index) => {
                    const status = getStockStatus(item.quantity);
                    const isLowStock =
                      status === "low-stock" || status === "critical";
                    const isOutOfStock = status === "out-of-stock";

                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          "transition-colors hover:bg-table-hover cursor-pointer",
                          index % 2 === 1 && "bg-table-zebra",
                          isLowStock && "bg-destructive/[0.02]",
                          isOutOfStock && "bg-muted/50",
                        )}
                        onClick={() => !isOutOfStock && handleBuyClick(item)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className={cn(
                              "font-medium",
                              isOutOfStock ? "text-muted-foreground" : "text-foreground"
                            )}>
                              {item.deviceName}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              Updated {item.lastUpdated}
                            </span>
                          </div>
                        </td>
                        <td className={cn(
                          "px-4 py-4 text-sm",
                          isOutOfStock ? "text-muted-foreground" : "text-foreground"
                        )}>
                          {item.brand}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <GradeBadge grade={item.grade} />
                        </td>
                        <td className={cn(
                          "px-4 py-4 text-sm",
                          isOutOfStock ? "text-muted-foreground" : "text-foreground"
                        )}>
                          {item.storage}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span
                            className={cn(
                              "font-semibold",
                              status === "out-of-stock" && "text-destructive",
                              status === "critical" && "text-destructive",
                              status === "low-stock" && "text-warning",
                              status === "in-stock" && "text-foreground",
                            )}
                          >
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={cn(
                              "font-medium",
                              isOutOfStock ? "text-muted-foreground" : "text-foreground"
                            )}>
                              {formatPrice(item.pricePerUnit)}
                            </span>
                            <PriceChangeIndicator change={item.priceChange} />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <StatusBadge quantity={item.quantity} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-8 w-8",
                                isInWishlist(item.id)
                                  ? "text-destructive hover:text-destructive"
                                  : "text-muted-foreground hover:text-destructive"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleWishlist(item);
                              }}
                            >
                              <Heart
                                className={cn(
                                  "h-4 w-4",
                                  isInWishlist(item.id) && "fill-current"
                                )}
                              />
                            </Button>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isOutOfStock) handleBuyClick(item);
                              }}
                              disabled={isOutOfStock}
                              className="gap-2"
                            >
                              <ShoppingCart className="h-4 w-4" />
                              {isOutOfStock ? "Out of Stock" : "Buy"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 pb-20">
            {filteredItems.map((item) => {
              const status = getStockStatus(item.quantity);
              const isLowStock =
                status === "low-stock" || status === "critical";
              const isOutOfStock = status === "out-of-stock";

              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-4 bg-card rounded-lg border border-border",
                    isLowStock && "border-destructive/20 bg-destructive/[0.02]",
                    isOutOfStock && "bg-muted/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <h3 className={cn(
                        "font-medium",
                        isOutOfStock ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {item.deviceName}
                      </h3>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        Updated {item.lastUpdated}
                      </span>
                    </div>
                    <StatusBadge quantity={item.quantity} />
                  </div>

                  <div className="grid grid-cols-5 gap-3 text-sm mb-4">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">
                        Brand
                      </span>
                      <span className={cn(
                        "font-medium",
                        isOutOfStock ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {item.brand}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">
                        Grade
                      </span>
                      <GradeBadge grade={item.grade} />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">
                        Storage
                      </span>
                      <span className={cn(
                        "font-medium",
                        isOutOfStock ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {item.storage}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">
                        Qty
                      </span>
                      <span
                        className={cn(
                          "font-semibold",
                          status === "out-of-stock" && "text-destructive",
                          status === "critical" && "text-destructive",
                          status === "low-stock" && "text-warning",
                          status === "in-stock" && "text-foreground",
                        )}
                      >
                        {item.quantity}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">
                        Price
                      </span>
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "font-medium",
                          isOutOfStock ? "text-muted-foreground" : "text-foreground"
                        )}>
                          ${item.pricePerUnit}
                        </span>
                        <PriceChangeIndicator change={item.priceChange} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-10 w-10 flex-shrink-0",
                        isInWishlist(item.id)
                          ? "text-destructive hover:text-destructive border-destructive/20"
                          : "text-muted-foreground hover:text-destructive"
                      )}
                      onClick={() => toggleWishlist(item)}
                    >
                      <Heart
                        className={cn(
                          "h-5 w-5",
                          isInWishlist(item.id) && "fill-current"
                        )}
                      />
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      onClick={() => !isOutOfStock && handleBuyClick(item)}
                      disabled={isOutOfStock}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {isOutOfStock ? "Out of Stock" : "Buy"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && !isFetching && <EmptyState />}
        </div>

        {/* Pagination - Fixed at bottom on mobile, sticky on desktop */}
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-background border-t border-border px-4 py-2 lg:sticky lg:bottom-0 lg:-mx-6 lg:px-6 lg:relative lg:left-auto lg:right-auto">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            rangeText={rangeText}
          />
        </div>
      </div>

      <PurchaseModal
        open={purchaseModalOpen}
        onOpenChange={setPurchaseModalOpen}
        item={selectedItem}
      />
    </>
  );
}
