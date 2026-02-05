import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export interface InsufficientStockItem {
  deviceName: string;
  requestedQty: number;
  availableQty: number;
}

interface OutOfStockWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insufficientItems: InsufficientStockItem[];
  onCancel: () => void;
  onReject: () => void;
  onApproveAnyway: () => void;
  isApproving?: boolean;
}

export function OutOfStockWarningDialog({
  open,
  onOpenChange,
  insufficientItems,
  onCancel,
  onReject,
  onApproveAnyway,
  isApproving = false,
}: OutOfStockWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <DialogTitle>Insufficient Stock Warning</DialogTitle>
              <DialogDescription>
                Some items in this order have insufficient stock
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <p className="text-sm text-muted-foreground">
            The following items do not have enough stock to fulfill this order:
          </p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {insufficientItems.map((item, index) => (
              <div
                key={index}
                className="p-3 bg-muted/50 rounded-lg border border-border"
              >
                <p className="font-medium text-foreground text-sm">
                  {item.deviceName}
                </p>
                <div className="flex items-center gap-4 mt-1 text-xs">
                  <span className="text-muted-foreground">
                    Requested: <span className="font-medium text-foreground">{item.requestedQty}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Available: <span className="font-medium text-destructive">{item.availableQty}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isApproving}
            className="sm:flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={isApproving}
            className="sm:flex-1"
          >
            Reject Order
          </Button>
          <Button
            onClick={onApproveAnyway}
            disabled={isApproving}
            className="sm:flex-1"
          >
            {isApproving ? "Approving..." : "Approve Anyway"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
