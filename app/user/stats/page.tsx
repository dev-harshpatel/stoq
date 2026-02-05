'use client'

export const dynamic = 'force-dynamic'

import { useMemo } from 'react';
import { UserLayout } from '@/components/UserLayout';
import { useOrders } from '@/contexts/OrdersContext';
import { useAuth } from '@/lib/auth/context';
import { StatCard } from '@/components/StatCard';
import { formatPrice } from '@/data/inventory';
import { Loader } from '@/components/Loader';
import {
  DollarSign,
  ShoppingCart,
  CheckCircle,
  Heart,
  Tag,
  TrendingUp,
  Clock,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UserStatsPage() {
  const { user, loading: authLoading } = useAuth();
  const { orders, isLoading: ordersLoading, getUserOrders } = useOrders();

  const userOrders = useMemo(() => {
    if (!user) return [];
    return getUserOrders(user.id);
  }, [user, orders, getUserOrders]);

  const stats = useMemo(() => {
    // Total expenditure (approved and completed orders)
    const totalExpenditure = userOrders
      .filter((o) => o.status === 'approved' || o.status === 'completed')
      .reduce((sum, order) => sum + order.totalPrice, 0);

    // Total orders placed
    const totalOrders = userOrders.length;

    // Orders by status
    const approvedOrders = userOrders.filter((o) => o.status === 'approved').length;
    const completedOrders = userOrders.filter((o) => o.status === 'completed').length;
    const pendingOrders = userOrders.filter((o) => o.status === 'pending').length;
    const rejectedOrders = userOrders.filter((o) => o.status === 'rejected').length;

    // Total discount earned (from confirmed invoices)
    const totalDiscount = userOrders
      .filter((o) => o.invoiceConfirmed && o.discountAmount)
      .reduce((sum, order) => sum + (order.discountAmount || 0), 0);

    // Most loved brands - count items by brand
    const brandCounts: Record<string, { count: number; spent: number }> = {};
    userOrders
      .filter((o) => o.status === 'approved' || o.status === 'completed')
      .forEach((order) => {
        if (Array.isArray(order.items)) {
          order.items.forEach((orderItem) => {
            const brand = orderItem.item?.brand;
            if (brand) {
              if (!brandCounts[brand]) {
                brandCounts[brand] = { count: 0, spent: 0 };
              }
              brandCounts[brand].count += orderItem.quantity || 1;
              brandCounts[brand].spent +=
                (orderItem.item?.pricePerUnit || 0) * (orderItem.quantity || 1);
            }
          });
        }
      });

    // Sort brands by count
    const sortedBrands = Object.entries(brandCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([brand, data]) => ({ brand, ...data }));

    const topBrand = sortedBrands[0] || null;

    // Total items purchased
    const totalItemsPurchased = userOrders
      .filter((o) => o.status === 'approved' || o.status === 'completed')
      .reduce((sum, order) => {
        if (Array.isArray(order.items)) {
          return sum + order.items.reduce((itemSum, item) => itemSum + (item.quantity || 1), 0);
        }
        return sum;
      }, 0);

    // Average order value
    const successfulOrders = userOrders.filter(
      (o) => o.status === 'approved' || o.status === 'completed'
    );
    const avgOrderValue =
      successfulOrders.length > 0 ? totalExpenditure / successfulOrders.length : 0;

    return {
      totalExpenditure,
      totalOrders,
      approvedOrders,
      completedOrders,
      pendingOrders,
      rejectedOrders,
      totalDiscount,
      topBrand,
      sortedBrands,
      totalItemsPurchased,
      avgOrderValue,
    };
  }, [userOrders]);

  const isLoading = authLoading || ordersLoading;

  if (isLoading) {
    return (
      <UserLayout>
        <Loader size="lg" text="Loading your stats..." />
      </UserLayout>
    );
  }

  if (!user) {
    return (
      <UserLayout>
        <div className="flex flex-col items-center justify-center h-full text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Please login to view your stats</p>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="space-y-6 pb-6">
          {/* Page Header */}
          <div>
            <h2 className="text-2xl font-semibold text-foreground">My Statistics</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of your purchase history and activity
            </p>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Expenditure"
              value={formatPrice(stats.totalExpenditure)}
              icon={<DollarSign className="h-5 w-5" />}
              accent="primary"
              description="From approved orders"
            />
            <StatCard
              title="Total Orders"
              value={stats.totalOrders}
              icon={<ShoppingCart className="h-5 w-5" />}
              accent="primary"
            />
            <StatCard
              title="Items Purchased"
              value={stats.totalItemsPurchased}
              icon={<CheckCircle className="h-5 w-5" />}
              accent="success"
            />
            <StatCard
              title="Total Discount Earned"
              value={formatPrice(stats.totalDiscount)}
              icon={<Tag className="h-5 w-5" />}
              accent="success"
              description="From confirmed invoices"
            />
          </div>

          {/* Order Status Stats */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Order Status Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                title="Pending"
                value={stats.pendingOrders}
                icon={<Clock className="h-5 w-5" />}
                accent="warning"
              />
              <StatCard
                title="Approved"
                value={stats.approvedOrders}
                icon={<CheckCircle className="h-5 w-5" />}
                accent="success"
              />
              <StatCard
                title="Completed"
                value={stats.completedOrders}
                icon={<TrendingUp className="h-5 w-5" />}
                accent="success"
              />
              <StatCard
                title="Rejected"
                value={stats.rejectedOrders}
                icon={<XCircle className="h-5 w-5" />}
                accent="destructive"
              />
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Favorite Brand Card */}
            <div className="bg-card rounded-lg border border-border shadow-soft p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Favorite Brand</h3>
                  <p className="text-xs text-muted-foreground">Your most ordered brand</p>
                </div>
              </div>
              {stats.topBrand ? (
                <div>
                  <p className="text-3xl font-bold text-foreground">{stats.topBrand.brand}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.topBrand.count} items purchased · {formatPrice(stats.topBrand.spent)} spent
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">No orders yet</p>
              )}
            </div>

            {/* Average Order Value Card */}
            <div className="bg-card rounded-lg border border-border shadow-soft p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Average Order Value</h3>
                  <p className="text-xs text-muted-foreground">Your typical order size</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {formatPrice(stats.avgOrderValue)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Based on {stats.approvedOrders + stats.completedOrders} successful orders
              </p>
            </div>
          </div>

          {/* Top Brands Breakdown */}
          {stats.sortedBrands.length > 0 && (
            <div className="bg-card rounded-lg border border-border shadow-soft">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Brand Preferences</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Breakdown of your purchases by brand
                </p>
              </div>
              <div className="divide-y divide-border">
                {stats.sortedBrands.slice(0, 5).map((brandData, idx) => {
                  const percentage =
                    stats.totalItemsPurchased > 0
                      ? Math.round((brandData.count / stats.totalItemsPurchased) * 100)
                      : 0;

                  return (
                    <div key={brandData.brand} className="px-6 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'text-xs font-medium w-6 h-6 rounded-full flex items-center justify-center',
                              idx === 0
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {idx + 1}
                          </span>
                          <span className="font-medium text-foreground">{brandData.brand}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-foreground">
                            {brandData.count} items
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({formatPrice(brandData.spent)})
                          </span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            idx === 0 ? 'bg-primary' : 'bg-muted-foreground/30'
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{percentage}% of purchases</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {stats.totalOrders === 0 && (
            <div className="bg-card rounded-lg border border-border shadow-soft p-12 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Orders Yet</h3>
              <p className="text-muted-foreground">
                Start shopping to see your purchase statistics here!
              </p>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
}
