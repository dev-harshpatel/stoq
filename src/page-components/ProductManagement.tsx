"use client";

import { Button } from "@/components/ui/button";
import { FilterBar, FilterValues } from "@/components/FilterBar";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/PaginationControls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInventory } from "@/contexts/InventoryContext";
import { useDebounce } from "@/hooks/use-debounce";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { InventoryItem, calculatePricePerUnit, formatPrice } from "@/data/inventory";
import {
  fetchFilterOptions,
  fetchPaginatedInventory,
  InventoryFilters,
} from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";
import { RotateCcw, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const defaultFilters: FilterValues = {
  search: "",
  brand: "all",
  grade: "all",
  storage: "all",
  priceRange: "all",
  stockStatus: "all",
};

const TableLoadingOverlay = ({ label }: { label: string }) => {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
      <div className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-2 shadow-sm">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-foreground">{label}</p>
      </div>
    </div>
  );
};

const ProductsTableSkeleton = ({ rows }: { rows: number }) => {
  return (
    <div className="rounded-lg border border-border bg-card overflow-x-auto">
      <table className="w-full">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-border bg-muted">
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
              Device Name
            </th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
              Brand
            </th>
            <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
              Grade
            </th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
              Storage
            </th>
            <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
              Quantity
            </th>
            <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
              Purchase Price
            </th>
            <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
              HST %
            </th>
            <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
              Price/Unit
            </th>
            <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
              Selling Price
            </th>
            <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, index) => (
            <tr
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              className={cn("animate-pulse", index % 2 === 1 && "bg-muted/20")}
            >
              <td className="px-6 py-4">
                <div className="h-9 w-[240px] rounded-md bg-muted" />
              </td>
              <td className="px-4 py-4">
                <div className="h-9 w-[140px] rounded-md bg-muted" />
              </td>
              <td className="px-4 py-4">
                <div className="mx-auto h-9 w-20 rounded-md bg-muted" />
              </td>
              <td className="px-4 py-4">
                <div className="h-9 w-[120px] rounded-md bg-muted" />
              </td>
              <td className="px-4 py-4">
                <div className="mx-auto h-9 w-24 rounded-md bg-muted" />
              </td>
              <td className="px-4 py-4">
                <div className="ml-auto h-9 w-28 rounded-md bg-muted" />
              </td>
              <td className="px-4 py-4">
                <div className="ml-auto h-9 w-20 rounded-md bg-muted" />
              </td>
              <td className="px-4 py-4">
                <div className="ml-auto h-9 w-24 rounded-md bg-muted" />
              </td>
              <td className="px-4 py-4">
                <div className="ml-auto h-9 w-28 rounded-md bg-muted" />
              </td>
              <td className="px-6 py-4">
                <div className="mx-auto h-9 w-24 rounded-md bg-muted" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function ProductManagement() {
  const { updateProduct, resetInventory } = useInventory();
  const [editedProducts, setEditedProducts] = useState<
    Record<string, Partial<InventoryItem>>
  >({});
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
    [
      debouncedSearch,
      filters.brand,
      filters.grade,
      filters.storage,
      filters.priceRange,
      filters.stockStatus,
    ],
  );

  const {
    data: filteredItems,
    totalCount,
    currentPage,
    totalPages,
    isLoading,
    isFetching,
    setCurrentPage,
    refresh,
    rangeText,
  } = usePaginatedQuery<InventoryItem>({
    fetchFn,
    dependencies: [
      debouncedSearch,
      filters.brand,
      filters.grade,
      filters.storage,
      filters.priceRange,
      filters.stockStatus,
    ],
    realtimeTable: "inventory",
  });

  const handleFieldChange = (
    id: string,
    field: keyof InventoryItem,
    value: string | number,
  ) => {
    setEditedProducts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSave = async (id: string) => {
    const updates = editedProducts[id];
    if (updates) {
      // Get current product + pending edits to recalculate price per unit
      const product = filteredItems.find((p) => p.id === id);
      if (product) {
        const qty = (updates.quantity ?? product.quantity) as number;
        const pp = (updates.purchasePrice ?? product.purchasePrice ?? 0) as number;
        const h = (updates.hst ?? product.hst ?? 0) as number;
        // Always recalculate price per unit when saving
        updates.pricePerUnit = calculatePricePerUnit(pp, qty, h);
      }
      await updateProduct(id, updates);
      setEditedProducts((prev) => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      toast.success("Product updated", {
        description: "Changes have been saved to inventory.",
      });
      await refresh();
    }
  };

  const handleReset = async () => {
    await resetInventory();
    setEditedProducts({});
    toast.success("Inventory reset", {
      description: "All products have been reset to original values.",
    });
    await refresh();
  };

  const getFieldValue = (
    product: InventoryItem,
    field: keyof InventoryItem,
  ) => {
    if (editedProducts[product.id]?.[field] !== undefined) {
      return editedProducts[product.id][field];
    }
    return product[field];
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
  };

  const hasChanges = Object.keys(editedProducts).length > 0;
  const shouldShowSkeleton =
    (isLoading || isFetching) && filteredItems.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-10 bg-background pb-4 space-y-4 border-b border-border mb-4 -mx-4 lg:-mx-6 px-4 lg:px-6 pt-4 lg:pt-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Edit Products
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {totalCount} products total. Make changes to product details.
            </p>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset All
              </Button>
            )}
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

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 -mx-4 lg:-mx-6 px-4 lg:px-6">
        {shouldShowSkeleton && <ProductsTableSkeleton rows={10} />}

        {/* Products Table */}
        {!shouldShowSkeleton && filteredItems.length > 0 && (
          <div className="relative rounded-lg border border-border bg-card overflow-x-auto">
            {isFetching && (
              <TableLoadingOverlay label="Searching products..." />
            )}
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border bg-muted">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                    Device Name
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                    Brand
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                    Grade
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                    Storage
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                    Quantity
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                    Purchase Price
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                    HST %
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                    Price/Unit
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                    Selling Price
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((product, index) => {
                  const hasEdits = !!editedProducts[product.id];
                  const deviceName = getFieldValue(
                    product,
                    "deviceName",
                  ) as string;
                  const brand = getFieldValue(product, "brand") as string;
                  const grade = getFieldValue(product, "grade") as
                    | "A"
                    | "B"
                    | "C"
                    | "D";
                  const storage = getFieldValue(product, "storage") as string;
                  const quantity = getFieldValue(product, "quantity") as number;
                  const purchasePrice = (getFieldValue(
                    product,
                    "purchasePrice",
                  ) ?? 0) as number;
                  const hst = (getFieldValue(
                    product,
                    "hst",
                  ) ?? 0) as number;
                  const sellingPrice = getFieldValue(
                    product,
                    "sellingPrice",
                  ) as number;
                  // Auto-calculate price per unit from formula
                  const calculatedPricePerUnit = calculatePricePerUnit(purchasePrice, quantity, hst);

                  return (
                    <tr
                      key={product.id}
                      className={cn(
                        "transition-colors hover:bg-muted/50",
                        index % 2 === 1 && "bg-muted/20",
                        hasEdits && "bg-primary/5",
                      )}
                    >
                      <td className="px-6 py-4">
                        <Input
                          value={deviceName}
                          onChange={(e) =>
                            handleFieldChange(
                              product.id,
                              "deviceName",
                              e.target.value,
                            )
                          }
                          className="min-w-[200px]"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <Input
                          value={brand}
                          onChange={(e) =>
                            handleFieldChange(
                              product.id,
                              "brand",
                              e.target.value,
                            )
                          }
                          className="min-w-[120px]"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <Select
                          value={grade}
                          onValueChange={(value) =>
                            handleFieldChange(
                              product.id,
                              "grade",
                              value as "A" | "B" | "C" | "D",
                            )
                          }
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-4">
                        <Input
                          value={storage}
                          onChange={(e) =>
                            handleFieldChange(
                              product.id,
                              "storage",
                              e.target.value,
                            )
                          }
                          className="min-w-[100px]"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <Input
                          type="number"
                          value={quantity}
                          onChange={(e) =>
                            handleFieldChange(
                              product.id,
                              "quantity",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-24 text-center"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-muted-foreground">$</span>
                          <Input
                            type="number"
                            value={purchasePrice}
                            onChange={(e) =>
                              handleFieldChange(
                                product.id,
                                "purchasePrice",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-28 text-right"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            type="number"
                            value={hst}
                            onChange={(e) =>
                              handleFieldChange(
                                product.id,
                                "hst",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-20 text-right"
                            min="0"
                            step="0.01"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-muted-foreground font-medium">
                          {formatPrice(calculatedPricePerUnit)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-muted-foreground">$</span>
                          <Input
                            type="number"
                            value={sellingPrice}
                            onChange={(e) =>
                              handleFieldChange(
                                product.id,
                                "sellingPrice",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-28 text-right"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {hasEdits && (
                            <Button
                              size="sm"
                              onClick={() => handleSave(product.id)}
                              className="gap-2"
                            >
                              <Save className="h-3 w-3" />
                              Save
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!shouldShowSkeleton && !isFetching && filteredItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No products found matching your filters.
          </div>
        )}
      </div>

      {/* Pagination - Sticky at bottom so it stays visible when scrolling on mobile */}
      {filteredItems.length > 0 && (
        <div className="flex-shrink-0 sticky bottom-0 z-10 bg-background border-t border-border -mx-4 lg:-mx-6 px-4 lg:px-6 py-2">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            rangeText={rangeText}
          />
        </div>
      )}
    </div>
  );
}
