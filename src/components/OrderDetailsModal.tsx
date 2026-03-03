import { useInventory } from "@/contexts/InventoryContext";
import { useNavigation } from "@/contexts/NavigationContext";
import { useOrders } from "@/contexts/OrdersContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GradeBadge } from "@/components/GradeBadge";
import { InvoiceConfirmationDialog } from "@/components/InvoiceConfirmationDialog";
import { OrderRejectionDialog } from "@/components/OrderRejectionDialog";
import {
  OutOfStockWarningDialog,
  InsufficientStockItem,
} from "@/components/OutOfStockWarningDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { formatPrice } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { TOAST_MESSAGES } from "@/lib/constants/toast-messages";
import { cn } from "@/lib/utils";
import { formatDateTimeInOntario } from "@/lib/utils/formatters";
import { Order } from "@/types/order";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  ShoppingBag,
  Trash2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { getStatusColor, getStatusLabel } from "@/lib/utils/status";

interface OrderDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

const getCostPerUnitWithoutHst = (
  purchasePrice: number | null | undefined,
  quantity: number,
  pricePerUnit: number,
  hst: number | null | undefined
): number | null => {
  if (quantity <= 0) return null;
  if (purchasePrice != null) {
    return purchasePrice / quantity;
  }
  if (hst != null && hst > 0) {
    return pricePerUnit / (1 + hst / 100);
  }
  return pricePerUnit;
};

export const OrderDetailsModal = ({
  open,
  onOpenChange,
  order,
}: OrderDetailsModalProps) => {
  const { startNavigation } = useNavigation();
  const { updateOrderStatus, downloadInvoicePDF, confirmInvoice, deleteOrder } =
    useOrders();
  // Only access inventory when modal is open to avoid unnecessary re-renders
  const { decreaseQuantity, inventory } = useInventory();
  const { isAdmin } = useUserProfile();
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [stockWarningDialogOpen, setStockWarningDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const isDeleteInFlightRef = useRef(false);
  const [insufficientStockItems, setInsufficientStockItems] = useState<
    InsufficientStockItem[]
  >([]);

  useEffect(() => {
    const fetchCustomerEmail = async () => {
      // Manual sales store customer info directly — no need to look up by userId
      if (!order?.userId || order?.isManualSale) return;

      try {
        const response = await fetch("/api/users/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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

  const orderItems = Array.isArray(order.items) ? order.items : [];
  const profitRows = orderItems
    .filter((orderItem) => orderItem?.item)
    .map((orderItem) => {
      const qty = orderItem.quantity || 0;
      const sellingPerUnit =
        orderItem.item.sellingPrice ?? orderItem.item.pricePerUnit ?? 0;
      const batchQty = orderItem.item.quantity ?? 1;
      const rawCostPerUnit = getCostPerUnitWithoutHst(
        orderItem.item.purchasePrice,
        batchQty,
        orderItem.item.pricePerUnit ?? 0,
        orderItem.item.hst
      );
      const costPerUnit = rawCostPerUnit ?? (orderItem.item.pricePerUnit ?? 0);
      const revenue = sellingPerUnit * qty;
      const cost = costPerUnit * qty;
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : null;

      return {
        itemName: orderItem.item.deviceName || "Unknown Device",
        storage: orderItem.item.storage || "N/A",
        grade: orderItem.item.grade || "N/A",
        quantity: qty,
        sellingPerUnit,
        costPerUnit,
        revenue,
        cost,
        profit,
        margin,
      };
    });

  const totalRevenue = profitRows.reduce((sum, row) => sum + row.revenue, 0);
  const totalCost = profitRows.reduce((sum, row) => sum + row.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const totalMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const checkStockAvailability = (): InsufficientStockItem[] => {
    const items = orderItems;
    const insufficientItems: InsufficientStockItem[] = [];

    for (const orderItem of items) {
      if (!orderItem?.item?.id || !orderItem?.quantity) continue;

      const inventoryItem = inventory.find(
        (inv) => inv.id === orderItem.item.id
      );
      const availableQty = inventoryItem?.quantity ?? 0;

      if (availableQty < orderItem.quantity) {
        insufficientItems.push({
          deviceName: orderItem.item.deviceName || "Unknown Device",
          requestedQty: orderItem.quantity,
          availableQty,
        });
      }
    }

    return insufficientItems;
  };

  const proceedWithApproval = async () => {
    setIsApproving(true);
    try {
      const items = Array.isArray(order.items) ? order.items : [];

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

      toast.success(TOAST_MESSAGES.ORDER_APPROVED(order.id));
      setStockWarningDialogOpen(false);
      onOpenChange(false);
    } catch (error) {
      toast.error(TOAST_MESSAGES.ORDER_FAILED_APPROVE);
    } finally {
      setIsApproving(false);
    }
  };

  const handleApprove = async () => {
    const items = Array.isArray(order.items) ? order.items : [];

    if (items.length === 0) {
      toast.error(TOAST_MESSAGES.ORDER_NO_ITEMS);
      return;
    }

    // Check stock availability (use memoized result)
    const insufficientItems = checkStockAvailability;

    if (insufficientItems.length > 0) {
      // Show warning dialog
      setInsufficientStockItems(insufficientItems);
      setStockWarningDialogOpen(true);
      return;
    }

    // No stock issues, proceed with approval
    await proceedWithApproval();
  };

  const handleApproveAnyway = async () => {
    await proceedWithApproval();
  };

  const handleRejectFromWarning = () => {
    setStockWarningDialogOpen(false);
    setRejectionDialogOpen(true);
  };

  const handleCancelWarning = () => {
    setStockWarningDialogOpen(false);
    setInsufficientStockItems([]);
  };

  const handleReject = async (reason: string, comment: string) => {
    setIsRejecting(true);
    try {
      await updateOrderStatus(order.id, "rejected", reason, comment);

      toast.success(TOAST_MESSAGES.ORDER_REJECTED(order.id));
      onOpenChange(false);
    } catch (error) {
      toast.error(TOAST_MESSAGES.ORDER_FAILED_REJECT);
      throw error;
    } finally {
      setIsRejecting(false);
    }
  };

  // Only admins can approve or reject orders
  const canApprove = order.status === "pending" && isAdmin;
  const canReject = order.status === "pending" && isAdmin;
  const canDeleteOrder =
    isAdmin && (order.status === "approved" || order.status === "completed");

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
      toast.success(TOAST_MESSAGES.INVOICE_DOWNLOADED);
    } catch (error) {
      toast.error(TOAST_MESSAGES.INVOICE_DOWNLOAD_FAILED);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleConfirmInvoice = async () => {
    if (!order) return;

    setIsConfirming(true);
    try {
      await confirmInvoice(order.id);
      toast.success(TOAST_MESSAGES.INVOICE_CONFIRMED);
      setConfirmationDialogOpen(false);
    } catch (error) {
      toast.error(TOAST_MESSAGES.INVOICE_CONFIRM_FAILED);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCreateEditInvoice = () => {
    if (!order) {
      return;
    }

    startNavigation();
    router.push(`/admin/orders/${order.id}/invoice`);
    onOpenChange(false);
  };

  const handleDeleteOrder = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== "confirm") return;
    if (isDeleteInFlightRef.current) return;

    isDeleteInFlightRef.current = true;
    setIsDeleting(true);
    try {
      await deleteOrder(order.id);
      toast.success("Order deleted and stock restored successfully.");
      setDeleteDialogOpen(false);
      setDeleteConfirmText("");
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete order. Please try again.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
      isDeleteInFlightRef.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-start justify-between pr-8">
            <div>
              <DialogTitle>
                Order #{order.id.slice(-8).toUpperCase()}
              </DialogTitle>
              <DialogDescription>Order details and summary</DialogDescription>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-sm flex-shrink-0",
                getStatusColor(order.status)
              )}
            >
              {getStatusLabel(order.status)}
            </Badge>
          </div>
        </DialogHeader>

        {isAdmin ? (
          <Tabs
            defaultValue="order"
            className="flex-1 min-h-0 flex flex-col overflow-hidden"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="order">Order</TabsTrigger>
              <TabsTrigger value="profit">Profit</TabsTrigger>
            </TabsList>

            <TabsContent
              value="order"
              className="flex-1 min-h-0 mt-3 overflow-y-auto pr-1 data-[state=active]:flex data-[state=active]:flex-col"
            >
              <div className="space-y-6 pb-3">
          {/* Manual Sale Banner */}
          {order.isManualSale && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-orange-50 border border-orange-200 dark:bg-orange-950 dark:border-orange-800 text-sm text-orange-700 dark:text-orange-400">
              <ShoppingBag className="h-4 w-4 flex-shrink-0" />
              <span>
                This is a manually recorded sale — it was created directly by an
                admin.
              </span>
            </div>
          )}

          {/* Order Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Order Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Customer:</span>
                {order.isManualSale ? (
                  <>
                    <p className="font-medium text-foreground mt-1">
                      {order.manualCustomerName || "Walk-in Customer"}
                    </p>
                    {order.manualCustomerEmail && (
                      <p className="text-xs text-muted-foreground">
                        {order.manualCustomerEmail}
                      </p>
                    )}
                    {order.manualCustomerPhone && (
                      <p className="text-xs text-muted-foreground">
                        {order.manualCustomerPhone}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="font-medium text-foreground mt-1">
                    {customerEmail || order.userId.slice(0, 8) + "..."}
                  </p>
                )}
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
                            {orderItem.item.deviceName || "Unknown Device"}
                          </h4>
                          <div className="flex items-center gap-2 mt-2">
                            {orderItem.item.grade && (
                              <GradeBadge grade={orderItem.item.grade} />
                            )}
                            <Badge variant="outline" className="text-xs">
                              {orderItem.item.storage || "N/A"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Quantity: {orderItem.quantity || 0}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {formatPrice(
                              orderItem.item.sellingPrice ??
                                orderItem.item.pricePerUnit ??
                                0
                            )}{" "}
                            each
                          </p>
                          <p className="font-semibold text-foreground mt-1">
                            {formatPrice(
                              (orderItem.item.sellingPrice ??
                                orderItem.item.pricePerUnit ??
                                0) * (orderItem.quantity || 0)
                            )}
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
          {order.status === "rejected" &&
            (order.rejectionReason || order.rejectionComment) && (
              <div className="border-t border-border pt-3">
                <div className="px-3 py-2 bg-destructive/10 rounded-md border border-destructive/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-medium text-destructive">
                        Rejected
                      </p>
                      {order.rejectionReason && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Reason:</span>{" "}
                          {order.rejectionReason}
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
            {/* Subtotal (first line) */}
            {order.subtotal !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium text-foreground">
                  {formatPrice(order.subtotal)}
                </span>
              </div>
            )}
            {/* Discount (second line) - show only if invoice is confirmed (for users) or always (for admin) */}
            {order.discountAmount != null &&
              order.discountAmount > 0 &&
              (isAdmin || order.invoiceConfirmed) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="font-medium text-success">
                    -{formatPrice(order.discountAmount)}
                  </span>
                </div>
              )}
            {/* Shipping (third line) - show only if invoice is confirmed (for users) or always (for admin) */}
            {order.shippingAmount != null &&
              order.shippingAmount > 0 &&
              (isAdmin || order.invoiceConfirmed) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Shipping:</span>
                  <span className="font-medium text-foreground">
                    {formatPrice(order.shippingAmount)}
                  </span>
                </div>
              )}
            {/* Result (subtotal - discount + shipping) */}
            {(() => {
              const discount =
                isAdmin || order.invoiceConfirmed
                  ? order.discountAmount || 0
                  : 0;
              const shipping =
                isAdmin || order.invoiceConfirmed
                  ? order.shippingAmount || 0
                  : 0;
              const result = (order.subtotal || 0) - discount + shipping;

              if (discount > 0 || shipping > 0) {
                return (
                  <div className="flex items-center justify-between text-sm pt-1">
                    <span className="text-muted-foreground font-medium">
                      Result:
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatPrice(result)}
                    </span>
                  </div>
                );
              }
              return null;
            })()}
            {/* Tax (fourth line) - applied to result */}
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
            {/* Total (final amount) */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-lg font-semibold text-foreground">
                Total:
              </span>
              <span className="text-2xl font-bold text-primary">
                {(() => {
                  // For users: show total without discount/shipping until invoice is confirmed
                  // For admins: always show the actual totalPrice (which includes discount/shipping if applied)
                  if (!isAdmin && !order.invoiceConfirmed) {
                    // Calculate total without discount/shipping for unconfirmed invoices (user view)
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
            </TabsContent>

            <TabsContent
              value="profit"
              className="flex-1 min-h-0 mt-3 overflow-y-auto pr-1 data-[state=active]:flex data-[state=active]:flex-col"
            >
              <div className="space-y-4 pb-3">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <h3 className="font-semibold text-foreground">
                    Profit Summary
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Estimated from item-level selling price and cost per unit
                    (purchase price without HST when available).
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="text-lg font-semibold text-foreground mt-1">
                        {formatPrice(totalRevenue)}
                      </p>
                    </div>
                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Cost</p>
                      <p className="text-lg font-semibold text-foreground mt-1">
                        {formatPrice(totalCost)}
                      </p>
                    </div>
                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Profit</p>
                      <p
                        className={cn(
                          "text-lg font-semibold mt-1",
                          totalProfit >= 0
                            ? "text-emerald-600"
                            : "text-destructive"
                        )}
                      >
                        {formatPrice(totalProfit)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Margin: {totalMargin.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Item Profit</h3>
                  {profitRows.length > 0 ? (
                    profitRows.map((row, index) => (
                      <div
                        key={`${row.itemName}-${index}`}
                        className="rounded-lg border border-border bg-card p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">
                              {row.itemName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {row.storage} • Grade {row.grade} • Qty{" "}
                              {row.quantity}
                            </p>
                          </div>
                          <p
                            className={cn(
                              "text-sm font-semibold",
                              row.profit >= 0
                                ? "text-emerald-600"
                                : "text-destructive"
                            )}
                          >
                            {formatPrice(row.profit)}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="rounded-md bg-muted/40 p-2">
                            <p className="text-muted-foreground">Sell / unit</p>
                            <p className="font-medium text-foreground">
                              {formatPrice(row.sellingPerUnit)}
                            </p>
                          </div>
                          <div className="rounded-md bg-muted/40 p-2">
                            <p className="text-muted-foreground">Cost / unit</p>
                            <p className="font-medium text-foreground">
                              {formatPrice(row.costPerUnit)}
                            </p>
                          </div>
                          <div className="rounded-md bg-muted/40 p-2">
                            <p className="text-muted-foreground">Revenue</p>
                            <p className="font-medium text-foreground">
                              {formatPrice(row.revenue)}
                            </p>
                          </div>
                          <div className="rounded-md bg-muted/40 p-2">
                            <p className="text-muted-foreground">Margin</p>
                            <p className="font-medium text-foreground">
                              {row.margin != null
                                ? `${row.margin.toFixed(2)}%`
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground text-center">
                      No items available for profit calculation.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pb-3">
            {/* Manual Sale Banner */}
            {order.isManualSale && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-orange-50 border border-orange-200 dark:bg-orange-950 dark:border-orange-800 text-sm text-orange-700 dark:text-orange-400">
                <ShoppingBag className="h-4 w-4 flex-shrink-0" />
                <span>
                  This is a manually recorded sale — it was created directly by
                  an admin.
                </span>
              </div>
            )}

            {/* Order Info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">
                Order Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Customer:</span>
                  {order.isManualSale ? (
                    <>
                      <p className="font-medium text-foreground mt-1">
                        {order.manualCustomerName || "Walk-in Customer"}
                      </p>
                      {order.manualCustomerEmail && (
                        <p className="text-xs text-muted-foreground">
                          {order.manualCustomerEmail}
                        </p>
                      )}
                      {order.manualCustomerPhone && (
                        <p className="text-xs text-muted-foreground">
                          {order.manualCustomerPhone}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="font-medium text-foreground mt-1">
                      {customerEmail || order.userId.slice(0, 8) + "..."}
                    </p>
                  )}
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
                              {orderItem.item.deviceName || "Unknown Device"}
                            </h4>
                            <div className="flex items-center gap-2 mt-2">
                              {orderItem.item.grade && (
                                <GradeBadge grade={orderItem.item.grade} />
                              )}
                              <Badge variant="outline" className="text-xs">
                                {orderItem.item.storage || "N/A"}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                Quantity: {orderItem.quantity || 0}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(
                                orderItem.item.sellingPrice ??
                                  orderItem.item.pricePerUnit ??
                                  0
                              )}{" "}
                              each
                            </p>
                            <p className="font-semibold text-foreground mt-1">
                              {formatPrice(
                                (orderItem.item.sellingPrice ??
                                  orderItem.item.pricePerUnit ??
                                  0) * (orderItem.quantity || 0)
                              )}
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
            {order.status === "rejected" &&
              (order.rejectionReason || order.rejectionComment) && (
                <div className="border-t border-border pt-3">
                  <div className="px-3 py-2 bg-destructive/10 rounded-md border border-destructive/20">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-medium text-destructive">
                          Rejected
                        </p>
                        {order.rejectionReason && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Reason:</span>{" "}
                            {order.rejectionReason}
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
              {/* Subtotal (first line) */}
              {order.subtotal !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium text-foreground">
                    {formatPrice(order.subtotal)}
                  </span>
                </div>
              )}
              {/* Discount (second line) - show only if invoice is confirmed (for users) or always (for admin) */}
              {order.discountAmount != null &&
                order.discountAmount > 0 &&
                (isAdmin || order.invoiceConfirmed) && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="font-medium text-success">
                      -{formatPrice(order.discountAmount)}
                    </span>
                  </div>
                )}
              {/* Shipping (third line) - show only if invoice is confirmed (for users) or always (for admin) */}
              {order.shippingAmount != null &&
                order.shippingAmount > 0 &&
                (isAdmin || order.invoiceConfirmed) && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Shipping:</span>
                    <span className="font-medium text-foreground">
                      {formatPrice(order.shippingAmount)}
                    </span>
                  </div>
                )}
              {/* Result (subtotal - discount + shipping) */}
              {(() => {
                const discount =
                  isAdmin || order.invoiceConfirmed
                    ? order.discountAmount || 0
                    : 0;
                const shipping =
                  isAdmin || order.invoiceConfirmed
                    ? order.shippingAmount || 0
                    : 0;
                const result = (order.subtotal || 0) - discount + shipping;

                if (discount > 0 || shipping > 0) {
                  return (
                    <div className="flex items-center justify-between text-sm pt-1">
                      <span className="text-muted-foreground font-medium">
                        Result:
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatPrice(result)}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              {/* Tax (fourth line) - applied to result */}
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
              {/* Total (final amount) */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-lg font-semibold text-foreground">
                  Total:
                </span>
                <span className="text-2xl font-bold text-primary">
                  {(() => {
                    // For users: show total without discount/shipping until invoice is confirmed
                    // For admins: always show the actual totalPrice (which includes discount/shipping if applied)
                    if (!isAdmin && !order.invoiceConfirmed) {
                      // Calculate total without discount/shipping for unconfirmed invoices (user view)
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
        )}

        {/* Actions */}
        <div className="border-t border-border bg-background pt-4 space-y-3 shrink-0">
          {/* Admin Invoice Actions */}
          {isAdmin &&
            (canCreateEditInvoice ||
              canDownloadInvoice ||
              canConfirmInvoice) && (
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
                    toast.info(
                      "Invoice is being prepared. Please check back later."
                    );
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
                    {order.invoiceConfirmed
                      ? "Download Invoice"
                      : "Invoice Not Ready"}
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
              disabled={isApproving || isRejecting || isDeleting}
            >
              Close
            </Button>
            {canDeleteOrder && (
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isApproving || isRejecting || isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Order
              </Button>
            )}
            {canReject && (
              <Button
                variant="destructive"
                onClick={() => setRejectionDialogOpen(true)}
                disabled={isApproving || isRejecting || isDeleting}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject Order
              </Button>
            )}
            {canApprove && (
              <Button
                onClick={handleApprove}
                disabled={isApproving || isRejecting || isDeleting}
              >
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  "Approve Order"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(nextOpen) => {
          if (isDeleting) return;
          setDeleteDialogOpen(nextOpen);
          if (!nextOpen) {
            setDeleteConfirmText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
            <DialogDescription>
              Order is confirmed still you want to delete it? This will remove
              the order and restore stock back to inventory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-semibold text-foreground">confirm</span>{" "}
              to continue.
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type confirm"
              disabled={isDeleting}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteConfirmText("");
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOrder}
              disabled={
                isDeleting ||
                deleteConfirmText.trim().toLowerCase() !== "confirm"
              }
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Order"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <OutOfStockWarningDialog
        open={stockWarningDialogOpen}
        onOpenChange={setStockWarningDialogOpen}
        insufficientItems={insufficientStockItems}
        onCancel={handleCancelWarning}
        onReject={handleRejectFromWarning}
        onApproveAnyway={handleApproveAnyway}
        isApproving={isApproving}
      />
    </Dialog>
  );
};
