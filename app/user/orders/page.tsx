'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import { UserLayout } from '@/components/UserLayout'
import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth/context";
import { Order, OrderStatus } from "@/types/order";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, RotateCcw, Package, AlertCircle } from "lucide-react";
import { formatPrice } from "@/data/inventory";
import { cn, formatDateInOntario } from "@/lib/utils";
import { OrderDetailsModal } from "@/components/OrderDetailsModal";
import { EmptyState } from "@/components/EmptyState";
import { PaginationControls } from "@/components/PaginationControls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { useRealtimeContext } from "@/contexts/RealtimeContext";
import { fetchPaginatedUserOrders } from "@/lib/supabase/queries";

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

export default function UserOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const { ordersVersion } = useRealtimeContext();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const fetchFn = useCallback(
    async (range: { from: number; to: number }) => {
      if (!user) return { data: [], count: 0 };
      return fetchPaginatedUserOrders(user.id, statusFilter, range);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, statusFilter]
  );

  const {
    data: filteredOrders,
    totalCount,
    currentPage,
    totalPages,
    isLoading,
    setCurrentPage,
    rangeText,
  } = usePaginatedQuery<Order>({
    fetchFn,
    dependencies: [user?.id, statusFilter],
    realtimeVersion: ordersVersion,
  });

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  const handleResetFilter = () => {
    setStatusFilter("all");
  };

  // Show loading state while auth or orders are loading
  if (authLoading || isLoading) {
    return (
      <UserLayout>
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </UserLayout>
    );
  }

  if (!user) {
    return (
      <UserLayout>
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Please login to view your orders</p>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="flex flex-col h-full">
        {/* Sticky Header Section */}
        <div className="sticky top-0 z-10 bg-background pb-4 space-y-4 border-b border-border mb-4 -mx-4 lg:-mx-6 px-4 lg:px-6 pt-4 lg:pt-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">My Orders</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {totalCount}{" "}
                {statusFilter !== "all" ? "filtered" : "total"} orders
              </p>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as OrderStatus | "all")
                }
              >
                <SelectTrigger className="w-40 bg-background border-border">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              {statusFilter !== "all" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilter}
                  className="border-border"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0 -mx-4 lg:-mx-6 px-4 lg:px-6">
          {/* Orders Table */}
          {filteredOrders.length === 0 && !isLoading ? (
            <EmptyState
              title="No orders found"
              description="Please order something to see your orders here."
            />
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
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                        Notes
                      </th>
                      <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredOrders.map((order, index) => (
                      <tr
                        key={order.id}
                        className={cn(
                          "transition-colors hover:bg-muted/50",
                          index % 2 === 1 && "bg-muted/30"
                        )}
                      >
                        <td className="px-6 py-4">
                          <span className="font-medium text-foreground">
                            #{order.id.slice(-8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-foreground">
                          {Array.isArray(order.items) && order.items.length > 0
                            ? Array.from(
                                new Set(order.items.map((item) => item.item?.brand).filter(Boolean))
                              ).join(", ")
                            : "N/A"}
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-foreground">
                          {Array.isArray(order.items) ? order.items.length : 0} item(s)
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex flex-col items-end">
                            {order.discountAmount != null && order.discountAmount > 0 && order.invoiceConfirmed && (
                              <span className="text-xs text-success mb-1">
                                Discount: -{formatPrice(order.discountAmount)}
                              </span>
                            )}
                            <span className="font-semibold text-foreground">
                              {(() => {
                                // For users: show total without discount until invoice is confirmed
                                if (!order.invoiceConfirmed) {
                                  const subtotal = order.subtotal || 0;
                                  const taxAmount = order.taxAmount || 0;
                                  return formatPrice(subtotal + taxAmount);
                                }
                                // Show the actual totalPrice (which includes discount) when invoice is confirmed
                                return formatPrice(order.totalPrice);
                              })()}
                            </span>
                          </div>
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
                        <td className="px-4 py-4">
                          {order.status === "rejected" && (order.rejectionReason || order.rejectionComment) ? (
                            <div className="flex items-start gap-2 max-w-xs">
                              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                              <div className="flex-1 space-y-1">
                                {order.rejectionReason && (
                                  <p className="text-xs text-foreground">
                                    <span className="font-medium">Reason:</span> {order.rejectionReason}
                                  </p>
                                )}
                                {order.rejectionComment && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {order.rejectionComment}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
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

        {/* Pagination - Sticky at bottom so it stays visible when scrolling on mobile */}
        {filteredOrders.length > 0 && (
          <div className="flex-shrink-0 sticky bottom-0 z-10 bg-background border-t border-border -mx-4 lg:-mx-6 px-4 lg:px-6 py-2">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              rangeText={rangeText}
            />
          </div>
        )}
      </div>

      <OrderDetailsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        order={selectedOrder}
      />
    </UserLayout>
  );
}
