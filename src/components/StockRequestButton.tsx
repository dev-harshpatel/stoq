"use client";

import { useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useStockRequests } from "@/contexts/StockRequestContext";
import { useAuth } from "@/lib/auth/context";
import { useRouter } from "next/navigation";
import type { InventoryItem } from "@/data/inventory";
import { cn } from "@/lib/utils";

interface StockRequestButtonProps {
  item: InventoryItem;
  className?: string;
}

export function StockRequestButton({
  item,
  className,
}: StockRequestButtonProps) {
  const { user } = useAuth();
  const { userRequestMap, createRequest, cancelRequest } = useStockRequests();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const existingRequest = userRequestMap[item.id];
  const hasRequest = !!existingRequest;


  const openDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Please log in to request stock notifications");
      return;
    }
    setQuantity(existingRequest ? String(existingRequest.quantity) : "1");
    setNote(existingRequest?.note ?? "");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) return;

    setIsSubmitting(true);
    try {
      await createRequest(item.id, qty, note.trim() || undefined);
      toast.success(`Added to your waitlist`, {
        description: `We'll notify you when ${item.deviceName} is back. Check your waitlist in Orders.`,
        action: {
          label: "View Waitlist",
          onClick: () => router.push("/user/orders?tab=waitlist"),
        },
        duration: 6000,
      });
      setDialogOpen(false);
    } catch {
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCancelling(true);
    try {
      await cancelRequest(item.id);
      toast.success("Stock request cancelled");
    } catch {
      toast.error("Failed to cancel request.");
    } finally {
      setIsCancelling(false);
    }
  };

  /* ── Already requested state ── */
  if (hasRequest) {
    return (
      <Button
        size="icon"
        variant="ghost"
        onClick={handleCancel}
        disabled={isCancelling}
        className={cn(
          "text-amber-600 hover:text-red-600 hover:bg-red-50",
          "dark:text-amber-400 dark:hover:text-red-400 dark:hover:bg-red-950/50",
          "transition-colors",
          className
        )}
        title="Requested — click to cancel"
      >
        {isCancelling ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Bell className="h-4 w-4 fill-current" />
        )}
      </Button>
    );
  }

  /* ── Not yet requested state ── */
  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        onClick={openDialog}
        className={cn(
          "text-muted-foreground hover:text-primary",
          className
        )}
        title="Notify me when back in stock"
      >
        <Bell className="h-4 w-4" />
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Request Stock</DialogTitle>
            <DialogDescription>
              We'll prioritise restocking{" "}
              <span className="font-semibold text-foreground">
                {item.deviceName} {item.storage} (Grade {item.grade})
              </span>
              . Tell us how many units you need.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="sr-qty">Units needed</Label>
              <Input
                id="sr-qty"
                type="number"
                min="1"
                max="50"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sr-note">
                Note{" "}
                <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="sr-note"
                placeholder="Any specific requirements or timeline..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[70px] resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleSubmit}
                disabled={isSubmitting || !quantity || parseInt(quantity) < 1}
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
