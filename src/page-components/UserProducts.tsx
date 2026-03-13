"use client";

import { Fragment, useMemo, useState } from "react";
import { ShoppingCart, FileText, Heart } from "lucide-react";
import { useWishlist } from "@/contexts/WishlistContext";
import { InventoryItem, getStockStatus } from "@/data/inventory";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FilterBar,
  FilterValues,
  defaultFilters,
  buildServerFilters,
} from "@/components/FilterBar";
import { PurchaseModal } from "@/components/PurchaseModal";
import { ProductDetailSheet } from "@/components/ProductDetailSheet";
import { StockRequestButton } from "@/components/StockRequestButton";
import { GradeBadge } from "@/components/GradeBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { PaginationControls } from "@/components/PaginationControls";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TOAST_MESSAGES } from "@/lib/constants/toast-messages";
import { useDebounce } from "@/hooks/use-debounce";
import { usePaginatedReactQuery } from "@/hooks/use-paginated-react-query";
import { usePageParam } from "@/hooks/use-page-param";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchPaginatedInventory,
  fetchAllFilteredInventory,
} from "@/lib/supabase/queries";
import { useFilterOptions } from "@/hooks/use-filter-options";

export default function UserProducts() {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [detailSheetItem, setDetailSheetItem] = useState<InventoryItem | null>(
    null
  );
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const filterOptions = useFilterOptions();

  const debouncedSearch = useDebounce(filters.search);

  const serverFilters = buildServerFilters(debouncedSearch, filters);

  const [currentPage, setCurrentPage] = usePageParam();
  const queryKey = queryKeys.inventoryPage(currentPage, serverFilters);

  const filtersKey = JSON.stringify(serverFilters);

  const {
    data: filteredItems,
    totalCount,
    totalPages,
    isLoading,
    isFetching,
    rangeText,
  } = usePaginatedReactQuery<InventoryItem>({
    queryKey,
    fetchFn: (range) => fetchPaginatedInventory(serverFilters, range),
    currentPage,
    setCurrentPage,
    filtersKey,
  });

  const handleBuyClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setPurchaseModalOpen(true);
  };

  const handleCardTap = (item: InventoryItem) => {
    setDetailSheetItem(item);
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
  };

  // Group products by brand (company) for display: Google together, Apple together, etc.
  const groupedByBrand = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, InventoryItem[]>();
    for (const item of filteredItems) {
      if (!map.has(item.brand)) {
        order.push(item.brand);
        map.set(item.brand, []);
      }
      map.get(item.brand)!.push(item);
    }
    return order.map((brand) => ({ brand, items: map.get(brand)! }));
  }, [filteredItems]);

  const handleExportPDF = async () => {
    try {
      const allItems = await fetchAllFilteredInventory(serverFilters);
      if (allItems.length === 0) {
        toast.error(TOAST_MESSAGES.EXPORT_NO_DATA, {
          description: "Please ensure there are items to export",
        });
        return;
      }
      const { exportToPDF } = await import("@/lib/export/pdf");
      exportToPDF(allItems, "inventory");
      toast.success(TOAST_MESSAGES.EXPORT_SUCCESS, {
        description: "Your PDF file has been downloaded",
      });
    } catch (error) {
      toast.error(TOAST_MESSAGES.EXPORT_FAILED, {
        description: "There was an error exporting to PDF",
      });
    }
  };

  const hasActiveFilters =
    serverFilters.search !== "" ||
    serverFilters.brand !== "all" ||
    serverFilters.grade !== "all" ||
    serverFilters.storage !== "all" ||
    serverFilters.priceRange !== "all" ||
    serverFilters.stockStatus !== "all";

  if (isLoading) {
    return <Loader size="lg" text="Loading products..." />;
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header Section - Sticky on desktop only */}
        <div className="lg:sticky lg:top-0 z-10 bg-background pb-3 border-b border-border mb-3">
          {/* Filter Bar with PDF export */}
          <FilterBar
            brands={filterOptions.brands}
            storageOptions={filterOptions.storageOptions}
            filters={filters}
            onFiltersChange={setFilters}
            onReset={handleResetFilters}
            trailing={
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                className="gap-2 shrink-0"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            }
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0">
          {filteredItems.length === 0 && !isFetching ? (
            <EmptyState
              title={
                hasActiveFilters ? "No products found" : "No products available"
              }
              description={
                hasActiveFilters
                  ? "Try adjusting your search or filter criteria to find what you're looking for."
                  : "Our inventory is currently empty. Check back soon for new devices!"
              }
            />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:flex md:flex-col rounded-lg border border-border bg-card h-full overflow-hidden">
                {/* Fixed Header */}
                <div className="flex-shrink-0 bg-muted border-b border-border">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5 w-[22%]">
                          Device Name
                        </th>
                        <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2.5 w-[10%]">
                          Brand
                        </th>
                        <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2.5 w-[8%]">
                          Grade
                        </th>
                        <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2.5 w-[10%]">
                          Storage
                        </th>
                        <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2.5 w-[8%]">
                          Qty
                        </th>
                        <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2.5 w-[12%]">
                          Price
                        </th>
                        <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5 w-[12%]">
                          Status
                        </th>
                        <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5 w-[18%]">
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
                      {groupedByBrand.map(({ brand, items: groupItems }) => (
                        <Fragment key={brand}>
                          {groupItems.map((item, index) => {
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
                                  isOutOfStock && "bg-muted/50"
                                )}
                                onClick={() =>
                                  !isOutOfStock && handleBuyClick(item)
                                }
                              >
                                <td className="px-4 py-2.5 text-center">
                                  <span
                                    className={cn(
                                      "font-medium text-sm",
                                      isOutOfStock
                                        ? "text-muted-foreground"
                                        : "text-foreground"
                                    )}
                                  >
                                    {item.deviceName}
                                  </span>
                                </td>
                                <td
                                  className={cn(
                                    "px-3 py-2.5 text-center text-sm",
                                    isOutOfStock
                                      ? "text-muted-foreground"
                                      : "text-foreground"
                                  )}
                                >
                                  {item.brand}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <GradeBadge grade={item.grade} />
                                </td>
                                <td
                                  className={cn(
                                    "px-3 py-2.5 text-center text-sm",
                                    isOutOfStock
                                      ? "text-muted-foreground"
                                      : "text-foreground"
                                  )}
                                >
                                  {item.storage}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span
                                    className={cn(
                                      "font-semibold text-sm",
                                      status === "out-of-stock" &&
                                        "text-destructive",
                                      status === "critical" &&
                                        "text-destructive",
                                      status === "low-stock" && "text-warning",
                                      status === "in-stock" && "text-foreground"
                                    )}
                                  >
                                    {item.quantity}
                                  </span>
                                </td>
                                <td
                                  className={cn(
                                    "px-3 py-2.5 text-center font-medium text-sm",
                                    isOutOfStock
                                      ? "text-muted-foreground"
                                      : "text-foreground"
                                  )}
                                >
                                  {formatPrice(item.sellingPrice)}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <StatusBadge quantity={item.quantity} />
                                </td>
                                <td className="px-4 py-2.5 text-center">
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
                                      aria-label={
                                        isInWishlist(item.id)
                                          ? "Remove item from wishlist"
                                          : "Add item to wishlist"
                                      }
                                    >
                                      <Heart
                                        className={cn(
                                          "h-4 w-4",
                                          isInWishlist(item.id) &&
                                            "fill-current"
                                        )}
                                      />
                                    </Button>
                                    {isOutOfStock ? (
                                      <StockRequestButton
                                        item={item}
                                        className="h-8 w-8"
                                      />
                                    ) : (
                                      <Button
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleBuyClick(item);
                                        }}
                                        title="Buy"
                                        aria-label="Buy item"
                                      >
                                        <ShoppingCart className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards - Compact layout (5-6 cards visible per screen) */}
              <div className="md:hidden space-y-2 pb-20">
                {groupedByBrand.map(({ brand, items: groupItems }) => (
                  <div key={brand} className="space-y-2">
                    {groupItems.map((item) => {
                      const status = getStockStatus(item.quantity);
                      const isLowStock =
                        status === "low-stock" || status === "critical";
                      const isOutOfStock = status === "out-of-stock";

                      return (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleCardTap(item)}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" ||
                              e.key === " "
                            ) {
                              e.preventDefault();
                              handleCardTap(item);
                            }
                          }}
                          aria-label={`View details for ${item.deviceName}`}
                          className={cn(
                            "flex flex-col gap-1.5 p-2 bg-card rounded-lg border border-border cursor-pointer active:bg-muted/50 transition-colors",
                            isLowStock &&
                              "border-destructive/20 bg-destructive/[0.02]",
                            isOutOfStock && "bg-muted/50"
                          )}
                        >
                          {/* Row 1: Device name (full width) */}
                          <span
                            className={cn(
                              "font-medium text-sm line-clamp-2",
                              isOutOfStock
                                ? "text-muted-foreground"
                                : "text-foreground"
                            )}
                          >
                            {item.deviceName}
                          </span>

                          {/* Row 2: Grade, Status, Price, Actions */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <GradeBadge grade={item.grade} />
                              <StatusBadge quantity={item.quantity} />
                              <span
                                className={cn(
                                  "font-semibold text-sm shrink-0",
                                  isOutOfStock
                                    ? "text-muted-foreground"
                                    : "text-foreground"
                                )}
                              >
                                {formatPrice(item.sellingPrice)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="outline"
                              size="icon"
                              className={cn(
                                "h-8 w-8 flex-shrink-0",
                                isInWishlist(item.id)
                                  ? "text-destructive hover:text-destructive border-destructive/20"
                                  : "text-muted-foreground hover:text-destructive"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleWishlist(item);
                              }}
                              aria-label={
                                isInWishlist(item.id)
                                  ? "Remove from wishlist"
                                  : "Add to wishlist"
                              }
                            >
                              <Heart
                                className={cn(
                                  "h-4 w-4",
                                  isInWishlist(item.id) && "fill-current"
                                )}
                              />
                            </Button>
                            {isOutOfStock ? (
                              <div onClick={(e) => e.stopPropagation()}>
                                <StockRequestButton
                                  item={item}
                                  className="h-8 w-8 flex-shrink-0"
                                />
                              </div>
                            ) : (
                              <Button
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBuyClick(item);
                                }}
                                title="Add to cart"
                                aria-label={`Add ${item.deviceName} to cart`}
                              >
                                <ShoppingCart className="h-4 w-4" />
                              </Button>
                            )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination - Fixed at bottom on mobile, sticky on desktop */}
        <div className="fixed bottom-0 left-0 right-0 z-10 flex-shrink-0 border-t border-border px-4 py-2 bg-background [&_button]:h-8 [&_button]:min-w-8 [&_button]:text-xs [&_button]:px-2 md:static md:[&_button]:h-10 md:[&_button]:min-w-10 md:[&_button]:text-sm lg:-mx-6 lg:px-6 lg:sticky lg:bottom-0">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            rangeText={rangeText}
          />
        </div>
      </div>

      <ProductDetailSheet
        open={!!detailSheetItem}
        onOpenChange={(open) => !open && setDetailSheetItem(null)}
        item={detailSheetItem}
        isInWishlist={isInWishlist}
        onToggleWishlist={toggleWishlist}
        onAddToCart={handleBuyClick}
      />

      <PurchaseModal
        open={purchaseModalOpen}
        onOpenChange={setPurchaseModalOpen}
        item={selectedItem}
      />
    </>
  );
}
