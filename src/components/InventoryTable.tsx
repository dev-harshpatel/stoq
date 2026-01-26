import { InventoryItem, formatPrice, getStockStatus } from "@/data/inventory";
import { StatusBadge } from "./StatusBadge";
import { GradeBadge } from "./GradeBadge";
import { PriceChangeIndicator } from "./PriceChangeIndicator";
import { EmptyState } from "./EmptyState";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface InventoryTableProps {
  items: InventoryItem[];
  className?: string;
}

export function InventoryTable({ items, className }: InventoryTableProps) {
  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      {/* Desktop Table */}
      <div
        className={cn(
          "hidden md:block rounded-lg border border-border bg-card overflow-auto max-h-[calc(100vh-280px)]",
          className,
        )}
      >
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-muted">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Device Name
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item, index) => {
                const status = getStockStatus(item.quantity);
                const isLowStock =
                  status === "low-stock" || status === "critical";

                return (
                  <tr
                    key={item.id}
                    className={cn(
                      "transition-colors hover:bg-table-hover",
                      index % 2 === 1 && "bg-table-zebra",
                      isLowStock && "bg-destructive/[0.02]",
                    )}
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
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className={cn("md:hidden space-y-3", className)}>
        {items.map((item) => {
          const status = getStockStatus(item.quantity);
          const isLowStock = status === "low-stock" || status === "critical";

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

              <div className="grid grid-cols-4 gap-3 text-sm">
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
            </div>
          );
        })}
      </div>
    </>
  );
}
