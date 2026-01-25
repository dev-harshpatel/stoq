import { Order, OrderStatus } from "@/types/order";
import { useOrders } from "@/contexts/OrdersContext";
import { useInventory } from "@/contexts/InventoryContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/data/inventory";
import { useToast } from "@/hooks/use-toast";
import { cn, formatDateTimeInOntario } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Loader2, XCircle, AlertCircle, FileText, Download, CheckCircle2 } from "lucide-react";
import { OrderRejectionDialog } from "@/components/OrderRejectionDialog";
import { InvoiceConfirmationDialog } from "@/components/InvoiceConfirmationDialog";
import { useRouter } from "next/navigation";

interface OrderDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case "pending":
      return "bg-warning/10 text-warning border-warning/20";
    case "approved":
      return "bg-success/10 text-success border-success/20";
    case "rejected":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "completed":
      return "bg-primary/10 text-primary border-primary/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getStatusLabel = (status: OrderStatus) => {
  switch (status) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "completed":
      return "Completed";
    default:
      return status;
  }
};

export const OrderDetailsModal = ({
  open,
  onOpenChange,
  order,
}: OrderDetailsModalProps) => {
  const { updateOrderStatus, downloadInvoicePDF, confirmInvoice } = useOrders();
  const { decreaseQuantity } = useInventory();
  const { isAdmin } = useUserProfile();
  const { toast } = useToast();
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);

  useEffect(() => {
    const fetchCustomerEmail = async () => {
      if (!order?.userId) return;

      try {
        const response = await fetch('/api/users/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userIds: [order.userId] }),
        });

        if (response.ok) {
          const data = await response.json();
          setCustomerEmail(data.emails[order.userId] || null);
        }
      } catch {
        // Silently handle error - email is optional
      }
    };

    if (open && order) {
      fetchCustomerEmail();
    }
  }, [open, order]);

  if (!order) return null;

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const items = Array.isArray(order.items) ? order.items : [];
      
      if (items.length === 0) {
        toast({
          title: "Error",
          description: "Order has no items to approve.",
          variant: "destructive",
        });
        setIsApproving(false);
        return;
      }

      // Decrease inventory quantities for each item in the order
      await Promise.all(
        items.map((orderItem) => {
          if (orderItem?.item?.id && orderItem?.quantity) {
            return decreaseQuantity(orderItem.item.id, orderItem.quantity);
          }
          return Promise.resolve();
        })
      );

      // Update order status (await to ensure it completes)
      await updateOrderStatus(order.id, "approved");
      
      toast({
        title: "Order approved",
        description: `Order #${order.id.slice(-8).toUpperCase()} has been approved. Inventory quantities have been updated.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update inventory quantities. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (reason: string, comment: string) => {
    setIsRejecting(true);
    try {
      await updateOrderStatus(order.id, "rejected", reason, comment);
      
      toast({
        title: "Order rejected",
        description: `Order #${order.id.slice(-8).toUpperCase()} has been rejected.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject order. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsRejecting(false);
    }
  };

  // Only admins can approve or reject orders
  const canApprove = order.status === "pending" && isAdmin;
  const canReject = order.status === "pending" && isAdmin;
  
  // Invoice actions
  const hasInvoice = !!order.invoiceNumber;
  const canDownloadInvoice = hasInvoice && (isAdmin || order.invoiceConfirmed);
  const canConfirmInvoice = hasInvoice && !order.invoiceConfirmed && isAdmin;
  const canCreateEditInvoice = isAdmin && order.status === "approved";

  const handleDownloadInvoice = async () => {
    if (!order) return;
    
    setIsDownloading(true);
    try {
      await downloadInvoicePDF(order.id);
      toast({
        title: "Invoice downloaded",
        description: "Invoice PDF has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleConfirmInvoice = async () => {
    if (!order) return;
    
    setIsConfirming(true);
    try {
      await confirmInvoice(order.id);
      toast({
        title: "Invoice confirmed",
        description: "Invoice has been confirmed. Customer can now download it.",
      });
      setConfirmationDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCreateEditInvoice = () => {
    router.push(`/admin/orders/${order.id}/invoice`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between pr-8">
            <div>
              <DialogTitle>
                Order #{order.id.slice(-8).toUpperCase()}
              </DialogTitle>
              <DialogDescription>
                Order details and summary
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className={cn("text-sm flex-shrink-0", getStatusColor(order.status))}
            >
              {getStatusLabel(order.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-6">
          {/* Order Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Order Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Customer:</span>
                <p className="font-medium text-foreground mt-1">
                  {customerEmail || order.userId.slice(0, 8) + '...'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Order Date:</span>
                <p className="font-medium text-foreground mt-1">
                  {formatDateTimeInOntario(order.createdAt)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <p className="font-medium text-foreground mt-1">
                  {formatDateTimeInOntario(order.updatedAt)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Items:</span>
                <p className="font-medium text-foreground mt-1">
                  {Array.isArray(order.items) ? order.items.length : 0} item(s)
                </p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Order Items</h3>
            <div className="space-y-3">
              {Array.isArray(order.items) && order.items.length > 0 ? (
                order.items.map((orderItem, index) => {
                  if (!orderItem?.item) return null;
                  return (
                    <div
                      key={index}
                      className="p-4 bg-muted/50 rounded-lg border border-border"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">
                            {orderItem.item.deviceName || 'Unknown Device'}
                          </h4>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              Grade {orderItem.item.grade || 'N/A'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {orderItem.item.storage || 'N/A'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Quantity: {orderItem.quantity || 0}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {formatPrice(orderItem.item.pricePerUnit || 0)} each
                          </p>
                          <p className="font-semibold text-foreground mt-1">
                            {formatPrice((orderItem.item.pricePerUnit || 0) * (orderItem.quantity || 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No items in this order
                </div>
              )}
            </div>
          </div>

          {/* Rejection Info */}
          {order.status === "rejected" && (order.rejectionReason || order.rejectionComment) && (
            <div className="border-t border-border pt-3">
              <div className="px-3 py-2 bg-destructive/10 rounded-md border border-destructive/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-medium text-destructive">Rejected</p>
                    {order.rejectionReason && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Reason:</span> {order.rejectionReason}
                      </p>
                    )}
                    {order.rejectionComment && (
                      <p className="text-xs text-muted-foreground">
                        {order.rejectionComment}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Order Total */}
          <div className="border-t border-border pt-4 space-y-2">
            {order.subtotal !== undefined && order.subtotal !== order.totalPrice && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium text-foreground">
                  {formatPrice(order.subtotal)}
                </span>
              </div>
            )}
            {order.taxAmount && order.taxRate && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Tax ({(order.taxRate * 100).toFixed(2)}%):
                </span>
                <span className="font-medium text-foreground">
                  {formatPrice(order.taxAmount)}
                </span>
              </div>
            )}
            {/* Show discount only if invoice is confirmed (for users) or always (for admin) */}
            {order.discountAmount && order.discountAmount > 0 && (isAdmin || order.invoiceConfirmed) && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Discount:</span>
                <span className="font-medium text-success">
                  -{formatPrice(order.discountAmount)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-lg font-semibold text-foreground">Total:</span>
              <span className="text-2xl font-bold text-primary">
                {(() => {
                  // For users: show total without discount until invoice is confirmed
                  // For admins: always show the actual totalPrice (which includes discount if applied)
                  if (!isAdmin && !order.invoiceConfirmed) {
                    // Calculate total without discount for unconfirmed invoices (user view)
                    const subtotal = order.subtotal || 0;
                    const taxAmount = order.taxAmount || 0;
                    return formatPrice(subtotal + taxAmount);
                  }
                  // For admins or confirmed invoices, show the actual totalPrice
                  return formatPrice(order.totalPrice);
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-border pt-4 space-y-3">
          {/* Admin Invoice Actions */}
          {isAdmin && (canCreateEditInvoice || canDownloadInvoice || canConfirmInvoice) && (
            <div className="flex gap-2 pb-3 border-b border-border">
              {canCreateEditInvoice && (
                <Button
                  variant="outline"
                  onClick={handleCreateEditInvoice}
                  disabled={isApproving || isRejecting}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {hasInvoice ? "Edit Invoice" : "Create Invoice"}
                </Button>
              )}
              {canDownloadInvoice && (
                <Button
                  variant="outline"
                  onClick={handleDownloadInvoice}
                  disabled={isDownloading || isApproving || isRejecting}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download Invoice
                    </>
                  )}
                </Button>
              )}
              {canConfirmInvoice && (
                <Button
                  onClick={() => setConfirmationDialogOpen(true)}
                  disabled={isConfirming || isApproving || isRejecting}
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirm Invoice
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
          
          {/* User Download Invoice Button */}
          {!isAdmin && order.status === "approved" && (
            <div className="flex gap-2 pb-3 border-b border-border">
              <Button
                variant="outline"
                onClick={() => {
                  if (order.invoiceConfirmed) {
                    handleDownloadInvoice();
                  } else {
                    toast({
                      title: "Invoice not available",
                      description: "Invoice is being prepared. Please check back later.",
                      variant: "default",
                    });
                  }
                }}
                disabled={!order.invoiceConfirmed || isDownloading}
                className="w-full"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    {order.invoiceConfirmed ? "Download Invoice" : "Invoice Not Ready"}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Order Actions */}
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={isApproving || isRejecting}
            >
              Close
            </Button>
            {canReject && (
              <Button
                variant="destructive"
                onClick={() => setRejectionDialogOpen(true)}
                disabled={isApproving || isRejecting}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject Order
              </Button>
            )}
            {canApprove && (
              <Button onClick={handleApprove} disabled={isApproving || isRejecting}>
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  'Approve Order'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      <OrderRejectionDialog
        open={rejectionDialogOpen}
        onOpenChange={setRejectionDialogOpen}
        onReject={handleReject}
      />

      <InvoiceConfirmationDialog
        open={confirmationDialogOpen}
        onOpenChange={setConfirmationDialogOpen}
        onConfirm={handleConfirmInvoice}
        order={order}
      />
    </Dialog>
  );
};

