import { Order, OrderStatus } from "@/types/order";
import { useOrders } from "@/contexts/OrdersContext";
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
  const { updateOrderStatus } = useOrders();
  const { toast } = useToast();

  if (!order) return null;

  const handleApprove = () => {
    updateOrderStatus(order.id, "approved");
    toast({
      title: "Order approved",
      description: `Order #${order.id.slice(-8).toUpperCase()} has been approved.`,
    });
    onOpenChange(false);
  };

  const canApprove = order.status === "pending";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
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
              className={cn("text-sm", getStatusColor(order.status))}
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
                <p className="font-medium text-foreground mt-1">{order.username}</p>
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
                  {order.items.length} item(s)
                </p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Order Items</h3>
            <div className="space-y-3">
              {order.items.map((orderItem, index) => (
                <div
                  key={index}
                  className="p-4 bg-muted/50 rounded-lg border border-border"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">
                        {orderItem.item.deviceName}
                      </h4>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          Grade {orderItem.item.grade}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {orderItem.item.storage}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Quantity: {orderItem.quantity}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(orderItem.item.pricePerUnit)} each
                      </p>
                      <p className="font-semibold text-foreground mt-1">
                        {formatPrice(orderItem.item.pricePerUnit * orderItem.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Total */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-foreground">Total:</span>
              <span className="text-2xl font-bold text-primary">
                {formatPrice(order.totalPrice)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-border pt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canApprove && (
            <Button onClick={handleApprove}>Approve Order</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

