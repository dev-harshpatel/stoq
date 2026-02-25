"use client";

// Force dynamic rendering to prevent static generation issues
export const dynamic = "force-dynamic";

import { UserLayout } from "@/components/UserLayout";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { Order, OrderStatus } from "@/types/order";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye,
  RotateCcw,
  Bell,
  CheckCircle2,
  Clock,
  ShoppingBag,
} from "lucide-react";
import { RejectionNote } from "@/components/RejectionNote";
import { formatPrice } from "@/data/inventory";
import { cn, formatDateInOntario } from "@/lib/utils";
import { OrderDetailsModal } from "@/components/OrderDetailsModal";
import { PaginationControls } from "@/components/PaginationControls";
import { Loader } from "@/components/Loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePaginatedReactQuery } from "@/hooks/use-paginated-react-query";
import { usePageParam } from "@/hooks/use-page-param";
import { queryKeys } from "@/lib/query-keys";
import { fetchPaginatedUserOrders } from "@/lib/supabase/queries";
import { getStatusColor, getStatusLabel } from "@/lib/utils/status";
import { useStockRequests } from "@/contexts/StockRequestContext";
import { GradeBadge } from "@/components/GradeBadge";
import { EmptyState } from "@/components/EmptyState";
import type { StockRequestWithItem } from "@/types/stockRequest";

export default function UserOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"orders" | "waitlist">(
    tabParam === "waitlist" ? "waitlist" : "orders"
  );

  const {
    allUserRequests,
    newlyFulfilledCount,
    markFulfilledSeen,
    isLoading: requestsLoading,
  } = useStockRequests();

  // Mark fulfilled as seen when the waitlist tab is opened
  useEffect(() => {
    if (activeTab === "waitlist" && newlyFulfilledCount > 0) {
      markFulfilledSeen();
    }
  }, [activeTab, newlyFulfilledCount, markFulfilledSeen]);

  // Sync tab state with URL param
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "orders" | "waitlist");
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "waitlist") {
      params.set("tab", "waitlist");
    } else {
      params.delete("tab");
    }
    router.replace(`/user/orders?${params.toString()}`, { scroll: false });
  };

  const [currentPage, setCurrentPage] = usePageParam();
  const queryKey = user?.id
    ? queryKeys.userOrdersPage(user.id, currentPage, statusFilter)
    : ["paginated", "userOrders", "disabled"];

  const filtersKey = `${user?.id}-${statusFilter}`;

  const {
    data: filteredOrders,
    totalCount,
    totalPages,
    isLoading,
    rangeText,
  } = usePaginatedReactQuery<Order>({
    queryKey,
    fetchFn: (range) => {
      if (!user) return Promise.resolve({ data: [], count: 0 });
      return fetchPaginatedUserOrders(user.id, statusFilter, range);
    },
    currentPage,
    setCurrentPage,
    filtersKey,
    enabled: !!user,
  });

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  if (authLoading) {
    return (
      <UserLayout>
        <Loader text="Loading..." />
      </UserLayout>
    );
  }

  if (!user) {
    return (
      <UserLayout>
        <EmptyState
          title="Please login"
          description="Please login to view your orders"
        />
      </UserLayout>
    );
  }

  const pendingRequests = allUserRequests.filter((r) => r.status === "pending");
  const fulfilledRequests = allUserRequests.filter(
    (r) => r.status === "fulfilled"
  );
  const waitlistTotal = allUserRequests.length;

  return (
    <UserLayout>
      <div className="flex flex-col h-full">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex flex-col h-full"
        >
          {/* ── Sticky header: title + tab switcher ── */}
          <div className="sticky top-0 z-10 bg-background pb-4 border-b border-border -mx-4 lg:-mx-6 px-4 lg:px-6 pt-4 lg:pt-6 space-y-3">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                My Orders
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Track your orders and waitlisted items
              </p>
            </div>

            <TabsList className="bg-muted/60">
              <TabsTrigger value="orders" className="gap-2">
                <ShoppingBag className="h-3.5 w-3.5" />
                Orders
                {totalCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 min-w-[1.25rem] px-1 text-xs"
                  >
                    {totalCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="waitlist" className="gap-2">
                <Bell className="h-3.5 w-3.5" />
                Waitlist
                {waitlistTotal > 0 && (
                  <Badge
                    variant={
                      newlyFulfilledCount > 0 ? "destructive" : "secondary"
                    }
                    className="ml-1 h-5 min-w-[1.25rem] px-1 text-xs"
                  >
                    {newlyFulfilledCount > 0
                      ? newlyFulfilledCount
                      : waitlistTotal}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Orders tab filter bar */}
            {activeTab === "orders" && (
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
                    onClick={() => setStatusFilter("all")}
                    className="border-border"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto min-h-0 -mx-4 lg:-mx-6 px-4 lg:px-6 mt-4">
            {/* Orders Tab */}
            <TabsContent value="orders" className="mt-0">
              {isLoading ? (
                <Loader text="Loading orders..." />
              ) : filteredOrders.length === 0 ? (
                <EmptyState
                  title="No orders found"
                  description="Place an order to see it here."
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
                              {Array.isArray(order.items) &&
                              order.items.length > 0
                                ? Array.from(
                                    new Set(
                                      order.items
                                        .map((item) => item.item?.brand)
                                        .filter(Boolean)
                                    )
                                  ).join(", ")
                                : "N/A"}
                            </td>
                            <td className="px-4 py-4 text-center text-sm text-foreground">
                              {Array.isArray(order.items)
                                ? order.items.length
                                : 0}{" "}
                              item(s)
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex flex-col items-end">
                                {order.discountAmount != null &&
                                  order.discountAmount > 0 &&
                                  order.invoiceConfirmed && (
                                    <span className="text-xs text-success mb-1">
                                      Discount:{" "}
                                      -{formatPrice(order.discountAmount)}
                                    </span>
                                  )}
                                <span className="font-semibold text-foreground">
                                  {(() => {
                                    if (!order.invoiceConfirmed) {
                                      const subtotal = order.subtotal || 0;
                                      const taxAmount = order.taxAmount || 0;
                                      return formatPrice(subtotal + taxAmount);
                                    }
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
                              {order.status === "rejected" ? (
                                <RejectionNote
                                  rejectionReason={order.rejectionReason}
                                  rejectionComment={order.rejectionComment}
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
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
            </TabsContent>

            {/* Waitlist Tab */}
            <TabsContent value="waitlist" className="mt-0">
              <WaitlistTab
                pendingRequests={pendingRequests}
                fulfilledRequests={fulfilledRequests}
                isLoading={requestsLoading}
                onShopNow={() => router.push("/user")}
              />
            </TabsContent>
          </div>

          {/* ── Sticky pagination footer (orders tab only) ── */}
          {activeTab === "orders" && filteredOrders.length > 0 && (
            <div className="flex-shrink-0 sticky bottom-0 z-10 bg-background border-t border-border -mx-4 lg:-mx-6 px-4 lg:px-6 py-2">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                rangeText={rangeText}
              />
            </div>
          )}
        </Tabs>
      </div>

      <OrderDetailsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        order={selectedOrder}
      />
    </UserLayout>
  );
}

/* ─── Waitlist Tab ────────────────────────────────────────────────────── */

function WaitlistTab({
  pendingRequests,
  fulfilledRequests,
  isLoading,
  onShopNow,
}: {
  pendingRequests: StockRequestWithItem[];
  fulfilledRequests: StockRequestWithItem[];
  isLoading: boolean;
  onShopNow: () => void;
}) {
  if (isLoading) return <Loader text="Loading your waitlist..." />;

  if (pendingRequests.length === 0 && fulfilledRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
          <Bell className="h-8 w-8 text-accent-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Your waitlist is empty
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          When you click "Notify me" on an out-of-stock item, it will appear
          here. We'll update you the moment it's back in stock.
        </p>
        <Button onClick={onShopNow} className="mt-5">
          Browse Products
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Fulfilled / Available items — shown first, most actionable */}
      {fulfilledRequests.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Back in Stock — Order Now!
            </h3>
            <Badge
              variant="outline"
              className="text-xs text-green-600 border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-800 dark:text-green-400"
            >
              {fulfilledRequests.length} available
            </Badge>
          </div>

          <div className="space-y-2">
            {fulfilledRequests.map((req) => (
              <WaitlistCard
                key={req.id}
                request={req}
                variant="fulfilled"
                onShopNow={onShopNow}
              />
            ))}
          </div>
        </section>
      )}

      {/* Pending / Waiting items */}
      {pendingRequests.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Waiting for Restock
            </h3>
            <Badge
              variant="outline"
              className="text-xs text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-400"
            >
              {pendingRequests.length} pending
            </Badge>
          </div>

          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <WaitlistCard key={req.id} request={req} variant="pending" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── Waitlist Card ───────────────────────────────────────────────────── */

function WaitlistCard({
  request,
  variant,
  onShopNow,
}: {
  request: StockRequestWithItem;
  variant: "pending" | "fulfilled";
  onShopNow?: () => void;
}) {
  const isFulfilled = variant === "fulfilled";
  const item = request.item;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 space-y-3 transition-all",
        isFulfilled
          ? "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/20"
          : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Item info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isFulfilled ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <Bell className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            <span className="font-semibold text-foreground truncate">
              {item?.deviceName ?? "Unknown Item"}
            </span>
            {item && <GradeBadge grade={item.grade as any} />}
            {item && (
              <span className="text-sm text-muted-foreground">
                {item.storage}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-6">
            {item?.brand} · Requested {request.quantity} unit
            {request.quantity !== 1 ? "s" : ""} ·{" "}
            {formatDateInOntario(request.createdAt)}
          </p>
          {request.note && (
            <p className="text-xs text-muted-foreground mt-1 ml-6 italic">
              Note: {request.note}
            </p>
          )}
        </div>

        {/* Status badge */}
        {isFulfilled ? (
          <Badge
            variant="outline"
            className="text-xs flex-shrink-0 text-green-600 border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-800 dark:text-green-400"
          >
            Available!
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-xs flex-shrink-0 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-400"
          >
            Waiting
          </Badge>
        )}
      </div>

      {/* Admin message (when fulfilled) */}
      {isFulfilled && request.adminMessage && (
        <div className="ml-6 rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40 px-3 py-2">
          <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-0.5">
            Message from the store
          </p>
          <p className="text-sm text-green-800 dark:text-green-300">
            {request.adminMessage}
          </p>
          {request.fulfilledAt && (
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">
              Restocked {formatDateInOntario(request.fulfilledAt)}
            </p>
          )}
        </div>
      )}

      {/* CTA for fulfilled items */}
      {isFulfilled && onShopNow && (
        <div className="ml-6">
          <Button size="sm" onClick={onShopNow} className="gap-2">
            <ShoppingBag className="h-3.5 w-3.5" />
            Shop Now
          </Button>
        </div>
      )}
    </div>
  );
}
