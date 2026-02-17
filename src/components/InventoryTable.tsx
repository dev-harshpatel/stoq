import { InventoryItem, getStockStatus } from "@/data/inventory";
import { formatPrice } from "@/lib/utils";
import { EmptyState } from "./EmptyState";
import { GradeBadge } from "./GradeBadge";
import { StatusBadge } from "./StatusBadge";
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
      {/* Desktop Table - single table so header and body columns stay aligned */}
      <div
        className={cn(
          "hidden md:flex md:flex-col rounded-lg border border-border bg-card h-full overflow-hidden",
          className
        )}
      >
        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full border-collapse">
            <colgroup>
              <col style={{ width: "22%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="sticky top-0 z-10 bg-muted border-b border-border text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                  Device Name
                </th>
                <th className="sticky top-0 z-10 bg-muted border-b border-border text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                  Grade
                </th>
                <th className="sticky top-0 z-10 bg-muted border-b border-border text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                  Storage
                </th>
                <th className="sticky top-0 z-10 bg-muted border-b border-border text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                  Qty
                </th>
                <th className="sticky top-0 z-10 bg-muted border-b border-border text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                  Purchase Price
                </th>
                <th className="sticky top-0 z-10 bg-muted border-b border-border text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                  HST %
                </th>
                <th className="sticky top-0 z-10 bg-muted border-b border-border text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                  Price/Unit
                </th>
                <th className="sticky top-0 z-10 bg-muted border-b border-border text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                  Selling Price
                </th>
                <th className="sticky top-0 z-10 bg-muted border-b border-border text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
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
                      isLowStock && "bg-destructive/[0.02]"
                    )}
                  >
                    <td className="px-6 py-4 text-center align-middle">
                      <div className="flex flex-col items-center justify-center text-center">
                        <span className="font-medium text-foreground text-center">
                          {item.deviceName}
                        </span>
                        <span className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1 text-center">
                          <Clock className="h-3 w-3" />
                          Updated {item.lastUpdated}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center align-middle">
                      <GradeBadge grade={item.grade} />
                    </td>
                    <td className="px-4 py-4 text-center align-middle text-sm text-foreground">
                      {item.storage}
                    </td>
                    <td className="px-4 py-4 text-center align-middle">
                      <span
                        className={cn(
                          "font-semibold",
                          status === "critical" && "text-destructive",
                          status === "low-stock" && "text-warning",
                          status === "in-stock" && "text-foreground"
                        )}
                      >
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center align-middle font-medium text-foreground">
                      {item.purchasePrice != null
                        ? formatPrice(item.purchasePrice)
                        : "—"}
                    </td>
                    <td className="px-4 py-4 text-center align-middle font-medium text-foreground">
                      {item.hst != null ? `${item.hst}%` : "—"}
                    </td>
                    <td className="px-4 py-4 text-center align-middle font-medium text-muted-foreground">
                      {formatPrice(item.pricePerUnit)}
                    </td>
                    <td className="px-4 py-4 text-center align-middle font-medium text-foreground">
                      {formatPrice(item.sellingPrice)}
                    </td>
                    <td className="px-6 py-4 text-center align-middle">
                      <StatusBadge quantity={item.quantity} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
                isLowStock && "border-destructive/20 bg-destructive/[0.02]"
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

              <div className="grid grid-cols-3 gap-3 text-sm">
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
                  <StatusBadge quantity={item.quantity} />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">
                    Purchase Price
                  </span>
                  <span className="font-medium text-foreground">
                    {item.purchasePrice != null
                      ? formatPrice(item.purchasePrice)
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">
                    HST
                  </span>
                  <span className="font-medium text-foreground">
                    {item.hst != null ? `${item.hst}%` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">
                    Price/Unit
                  </span>
                  <span className="font-medium text-muted-foreground">
                    {formatPrice(item.pricePerUnit)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">
                    Selling Price
                  </span>
                  <span className="font-medium text-foreground">
                    {formatPrice(item.sellingPrice)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
