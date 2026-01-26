"use client";

import { useState, useMemo } from "react";
import { ShoppingCart, FileText } from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import { InventoryItem, formatPrice, getStockStatus } from "@/data/inventory";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterValues } from "@/components/FilterBar";
import { PurchaseModal } from "@/components/PurchaseModal";
import { GradeBadge } from "@/components/GradeBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { PriceChangeIndicator } from "@/components/PriceChangeIndicator";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF } from "@/lib/exportUtils";
import { toast } from "sonner";

const defaultFilters: FilterValues = {
  search: "",
  brand: "all",
  grade: "all",
  storage: "all",
  priceRange: "all",
  stockStatus: "all",
};

export default function UserProducts() {
  const { inventory, isLoading } = useInventory();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
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

  const handleBuyClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setPurchaseModalOpen(true);
  };

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
  }, [inventory, filters]);

  const handleResetFilters = () => {
    setFilters(defaultFilters);
  };

  const handleExportPDF = () => {
    if (filteredItems.length === 0) {
      toast.error("No data to export", {
        description: "Please ensure there are items to export",
      });
      return;
    }

    try {
      exportToPDF(filteredItems, "inventory");
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
        {/* Sticky Header Section */}
        <div className="sticky top-0 z-10 bg-background pb-4 space-y-4 border-b border-border mb-4">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Products
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredItems.length} devices available
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
            brands={availableBrands}
            storageOptions={availableStorage}
            filters={filters}
            onFiltersChange={setFilters}
            onReset={handleResetFilters}
          />
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 min-h-0">
          {/* Desktop Table */}
          <div className="hidden md:block rounded-lg border border-border bg-card overflow-auto max-h-[calc(100vh-280px)]">
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
                      Qty
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                      Price/Unit
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                      Status
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredItems.map((item, index) => {
                    const status = getStockStatus(item.quantity);
                    const isLowStock =
                      status === "low-stock" || status === "critical";

                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          "transition-colors hover:bg-table-hover cursor-pointer",
                          index % 2 === 1 && "bg-table-zebra",
                          isLowStock && "bg-destructive/[0.02]",
                        )}
                        onClick={() => handleBuyClick(item)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {item.deviceName}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              Updated {item.lastUpdated}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-foreground">
                          {item.brand}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <GradeBadge grade={item.grade} />
                        </td>
                        <td className="px-4 py-4 text-sm text-foreground">
                          {item.storage}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span
                            className={cn(
                              "font-semibold",
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
                            <span className="font-medium text-foreground">
                              {formatPrice(item.pricePerUnit)}
                            </span>
                            <PriceChangeIndicator change={item.priceChange} />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <StatusBadge quantity={item.quantity} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBuyClick(item);
                            }}
                            className="gap-2"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            Buy
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredItems.map((item) => {
              const status = getStockStatus(item.quantity);
              const isLowStock =
                status === "low-stock" || status === "critical";

              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-4 bg-card rounded-lg border border-border",
                    isLowStock && "border-destructive/20 bg-destructive/[0.02]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">
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
                      <span className="font-medium text-foreground">
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
                      <span className="font-medium text-foreground">
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
                        <span className="font-medium text-foreground">
                          ${item.pricePerUnit}
                        </span>
                        <PriceChangeIndicator change={item.priceChange} />
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={() => handleBuyClick(item)}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Buy
                  </Button>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && <EmptyState />}
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
