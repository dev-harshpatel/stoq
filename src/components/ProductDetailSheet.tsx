"use client";

import { InventoryItem, getStockStatus } from "@/data/inventory";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GradeBadge } from "@/components/GradeBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { StockRequestButton } from "@/components/StockRequestButton";
import { Heart, ShoppingCart, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  isInWishlist: (id: string) => boolean;
  onToggleWishlist: (item: InventoryItem) => void;
  onAddToCart: (item: InventoryItem) => void;
}

export function ProductDetailSheet({
  open,
  onOpenChange,
  item,
  isInWishlist,
  onToggleWishlist,
  onAddToCart,
}: ProductDetailSheetProps) {
  if (!item) return null;

  const status = getStockStatus(item.quantity);
  const isOutOfStock = status === "out-of-stock";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[85vh] overflow-y-auto"
      >
        <SheetHeader className="text-left pb-4 border-b border-border">
          <SheetTitle className="text-lg font-semibold pr-8">
            {item.deviceName}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pt-4">
          {/* Status and Price row */}
          <div className="flex items-center justify-between">
            <StatusBadge quantity={item.quantity} />
            <span
              className={cn(
                "text-xl font-semibold",
                isOutOfStock ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {formatPrice(item.sellingPrice)}
            </span>
          </div>

          {/* Full details grid */}
          <div className="grid grid-cols-2 gap-4 py-4 border-y border-border">
            <div>
              <span className="text-xs text-muted-foreground block mb-1">
                Brand
              </span>
              <span
                className={cn(
                  "font-medium",
                  isOutOfStock ? "text-muted-foreground" : "text-foreground"
                )}
              >
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
              <span
                className={cn(
                  "font-medium",
                  isOutOfStock ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {item.storage}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-1">
                Quantity
              </span>
              <span
                className={cn(
                  "font-semibold",
                  status === "out-of-stock" && "text-destructive",
                  status === "critical" && "text-destructive",
                  status === "low-stock" && "text-warning",
                  status === "in-stock" && "text-foreground"
                )}
              >
                {item.quantity} units
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground block mb-1">
                Last updated
              </span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {item.lastUpdated}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-12 w-12 flex-shrink-0",
                isInWishlist(item.id)
                  ? "text-destructive hover:text-destructive border-destructive/20"
                  : "text-muted-foreground hover:text-destructive"
              )}
              onClick={() => onToggleWishlist(item)}
              aria-label={
                isInWishlist(item.id)
                  ? "Remove from wishlist"
                  : "Add to wishlist"
              }
            >
              <Heart
                className={cn("h-5 w-5", isInWishlist(item.id) && "fill-current")}
              />
            </Button>
            {isOutOfStock ? (
              <StockRequestButton item={item} className="flex-1 h-12" />
            ) : (
              <Button
                className="flex-1 h-12 gap-2"
                onClick={() => {
                  onAddToCart(item);
                  onOpenChange(false);
                }}
              >
                <ShoppingCart className="h-5 w-5" />
                Add to Cart
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
