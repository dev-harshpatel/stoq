'use client'

import { useOrders } from "@/contexts/OrdersContext";
import { useAuth } from "@/lib/auth/context";
import { Order, OrderStatus } from "@/types/order";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/data/inventory";
import { Clock, Package, AlertCircle } from "lucide-react";
import { cn, formatDateTimeInOntario } from "@/lib/utils";

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

export const UserOrders = () => {
  const { getUserOrders } = useOrders();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Please login to view your orders</p>
      </div>
    );
  }

  const orders = getUserOrders(user.id);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Package className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No orders yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Your orders will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {orders.map((order) => (
        <div
          key={order.id}
          className="p-3 bg-muted/50 rounded-lg border border-border"
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-foreground">
                  Order #{order.id.slice(-8).toUpperCase()}
                </h4>
                <Badge
                  variant="outline"
                  className={cn("text-xs", getStatusColor(order.status))}
                >
                  {getStatusLabel(order.status)}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDateTimeInOntario(order.createdAt)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-foreground">
                {formatPrice(order.totalPrice)}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-border">
            {Array.isArray(order.items) && order.items.length > 0 ? (
              order.items.map((orderItem, index) => {
                if (!orderItem?.item) return null;
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground">
                      {orderItem.quantity || 0}x {orderItem.item.deviceName || 'Unknown Device'}
                    </span>
                    <span className="text-muted-foreground">
                      {formatPrice((orderItem.item.pricePerUnit || 0) * (orderItem.quantity || 0))}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-muted-foreground">No items in this order</div>
            )}
          </div>

          {/* Rejection Notification */}
          {order.status === "rejected" && (order.rejectionReason || order.rejectionComment) && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold text-destructive">Order Rejected</p>
                    {order.rejectionReason && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Reason:</span> {order.rejectionReason}
                      </p>
                    )}
                    {order.rejectionComment && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Note:</span> {order.rejectionComment}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

