'use client'

import { useState, useCallback, useEffect, useMemo } from "react";
import { Order, OrderStatus } from "@/types/order";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, RotateCcw, Package, AlertCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/data/inventory";
import { cn, formatDateInOntario } from "@/lib/utils";
import { OrderDetailsModal } from "@/components/OrderDetailsModal";
import { EmptyState } from "@/components/EmptyState";
import { PaginationControls } from "@/components/PaginationControls";
import { Loader } from "@/components/Loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { fetchPaginatedOrders, OrdersFilters } from "@/lib/supabase/queries";

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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [loadingEmails, setLoadingEmails] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const serverFilters: OrdersFilters = {
    search: debouncedSearch,
    status: statusFilter,
  };

  const fetchFn = useCallback(
    async (range: { from: number; to: number }) => {
      return fetchPaginatedOrders(serverFilters, range);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedSearch, statusFilter]
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
    dependencies: [debouncedSearch, statusFilter],
    realtimeTable: "orders",
  });

  // Create a stable key based on unique user IDs from current page to fetch emails
  const userIdsKey = useMemo(() => {
    const uniqueUserIds = Array.from(
      new Set(filteredOrders.map((order) => order.userId))
    ).sort();
    return uniqueUserIds.join(',');
  }, [filteredOrders]);

  // Fetch user emails for unique user IDs on the current page
  useEffect(() => {
    const fetchUserEmails = async () => {
      if (!userIdsKey) return;

      const uniqueUserIds = userIdsKey.split(',').filter(Boolean);
      const missingUserIds = uniqueUserIds.filter(
        (userId) => !userEmails[userId]
      );

      if (missingUserIds.length === 0) return;

      setLoadingEmails(true);
      try {
        const response = await fetch('/api/users/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userIds: missingUserIds }),
        });

        if (response.ok) {
          const data = await response.json();
          setUserEmails((prev) => ({ ...prev, ...data.emails }));
        }
      } catch (error) {
      } finally {
        setLoadingEmails(false);
      }
    };

    fetchUserEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIdsKey]);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  const handleResetFilter = () => {
    setStatusFilter("all");
    setSearchQuery("");
  };

  const hasActiveFilters = statusFilter !== "all" || searchQuery.trim() !== "";

  if (isLoading && filteredOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4 animate-pulse" />
        <p className="text-muted-foreground">Loading orders...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Sticky Header Section */}
        <div className="sticky top-0 z-10 bg-background pb-4 space-y-4 border-b border-border mb-4 -mx-4 lg:-mx-6 px-4 lg:px-6 pt-4 lg:pt-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Orders</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {totalCount}{" "}
                {hasActiveFilters ? "filtered" : "total"} orders
              </p>
            </div>
          </div>

          {/* Search and Status Filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Search Bar */}
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID, status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background border-border"
              />
            </div>

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

              {hasActiveFilters && (
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
              description="There are no orders matching your current filter criteria."
            />
          ) : (
            <>
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
                            {userEmails[order.userId] || order.userId.slice(0, 8) + '...'}
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
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                rangeText={rangeText}
              />
            </>
          )}
        </div>
      </div>

      <OrderDetailsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        order={selectedOrder}
      />
    </>
  );
}
