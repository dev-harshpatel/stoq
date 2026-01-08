import { useState, useEffect } from "react";
import { useOrders } from "@/contexts/OrdersContext";
import { Order, OrderStatus } from "@/types/order";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { formatPrice } from "@/data/inventory";
import { cn, formatDateInOntario } from "@/lib/utils";
import { OrderDetailsModal } from "@/components/OrderDetailsModal";
import { EmptyState } from "@/components/EmptyState";

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

export default function Orders() {
  const { orders: allOrders } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const orders = [...allOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Orders</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {orders.length} total orders
            </p>
          </div>
        </div>

        {/* Orders Table */}
        {orders.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                      Order ID
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                      Customer
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                      Brand
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                      Items
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                      Total
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                      Date
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((order, index) => (
                    <tr
                      key={order.id}
                      className={cn(
                        "transition-colors hover:bg-table-hover",
                        index % 2 === 1 && "bg-table-zebra"
                      )}
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-foreground">
                          #{order.id.slice(-8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground">
                        {order.username}
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground">
                        {Array.from(
                          new Set(order.items.map((item) => item.item.brand))
                        ).join(", ")}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-foreground">
                        {order.items.length} item(s)
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-semibold text-foreground">
                          {formatPrice(order.totalPrice)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            getStatusColor(order.status)
                          )}
                        >
                          {getStatusLabel(order.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {formatDateInOntario(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewOrder(order)}
                          className="h-8 w-8"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <OrderDetailsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        order={selectedOrder}
      />
    </>
  );
}
