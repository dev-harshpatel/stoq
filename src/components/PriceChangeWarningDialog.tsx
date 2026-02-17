"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { ArrowUp, ArrowDown, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PriceChange {
  itemId: string;
  deviceName: string;
  storage: string;
  grade: string;
  oldPrice: number;
  newPrice: number;
  quantity: number;
}

interface PriceChangeWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceChanges: PriceChange[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PriceChangeWarningDialog({
  open,
  onOpenChange,
  priceChanges,
  onConfirm,
  onCancel,
  isLoading = false,
}: PriceChangeWarningDialogProps) {
  const totalOldPrice = priceChanges.reduce(
    (sum, item) => sum + item.oldPrice * item.quantity,
    0
  );
  const totalNewPrice = priceChanges.reduce(
    (sum, item) => sum + item.newPrice * item.quantity,
    0
  );
  const priceDifference = totalNewPrice - totalOldPrice;
  const isPriceIncrease = priceDifference > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Prices Updated
          </AlertDialogTitle>
          <AlertDialogDescription>
            Some prices have changed since you added items to your cart. Please
            review the updates below.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-[300px] overflow-y-auto space-y-3 my-4">
          {priceChanges.map((item) => {
            const isIncrease = item.newPrice > item.oldPrice;
            const difference = item.newPrice - item.oldPrice;
            const percentChange = ((difference / item.oldPrice) * 100).toFixed(
              1
            );

            return (
              <div
                key={item.itemId}
                className="p-3 bg-muted/50 rounded-lg border border-border"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground text-sm">
                      {item.deviceName}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        Grade {item.grade}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {item.storage}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        x{item.quantity}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(item.oldPrice)}
                      </span>
                      {isIncrease ? (
                        <ArrowUp className="h-4 w-4 text-destructive" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-green-500" />
                      )}
                      <span
                        className={cn(
                          "font-semibold text-sm",
                          isIncrease ? "text-destructive" : "text-green-500"
                        )}
                      >
                        {formatPrice(item.newPrice)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "text-xs mt-1",
                        isIncrease ? "text-destructive" : "text-green-500"
                      )}
                    >
                      {isIncrease ? "+" : ""}
                      {percentChange}% ({isIncrease ? "+" : ""}
                      {formatPrice(difference)})
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Total difference:
            </span>
            <span
              className={cn(
                "font-semibold",
                isPriceIncrease ? "text-destructive" : "text-green-500"
              )}
            >
              {isPriceIncrease ? "+" : ""}
              {formatPrice(priceDifference)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-medium text-foreground">
              New Total:
            </span>
            <span className="text-lg font-bold text-primary">
              {formatPrice(totalNewPrice)}
            </span>
          </div>
        </div>

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel onClick={onCancel} disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Continue with Updated Prices"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
