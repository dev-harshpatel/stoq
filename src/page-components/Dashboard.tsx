'use client'

import { useMemo } from 'react';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Clock,
} from 'lucide-react';
import { useInventory } from '@/contexts/InventoryContext';
import { useOrders } from '@/contexts/OrdersContext';
import { getStockStatus, formatPrice } from '@/data/inventory';
import { formatDateInOntario } from '@/lib/utils';
import { Loader } from '@/components/Loader';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: { value: string; positive: boolean };
  icon: React.ReactNode;
  accent?: 'primary' | 'success' | 'warning' | 'destructive';
}

function StatCard({ title, value, change, icon, accent = 'primary' }: StatCardProps) {
  const accentStyles = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="p-6 bg-card rounded-lg border border-border shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
          {change && (
            <div className="flex items-center gap-1 mt-2 text-sm">
              {change.positive ? (
                <ArrowUpRight className="h-4 w-4 text-success" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              )}
              <span className={change.positive ? 'text-success' : 'text-destructive'}>
                {change.value}
              </span>
              <span className="text-muted-foreground">vs last week</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-lg', accentStyles[accent])}>{icon}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { inventory, isLoading: inventoryLoading } = useInventory();
  const { orders, isLoading: ordersLoading } = useOrders();

  const stats = useMemo(() => {
    const totalDevices = inventory.length;
    const totalUnits = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = inventory.reduce(
      (sum, item) => sum + item.quantity * item.pricePerUnit,
      0
    );
    const lowStockItems = inventory.filter(
      (item) => getStockStatus(item.quantity) !== 'in-stock'
    ).length;

    // Order statistics
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === 'pending').length;
    const totalRevenue = orders
      .filter((o) => o.status === 'approved' || o.status === 'completed')
      .reduce((sum, order) => sum + order.totalPrice, 0);
    const completedOrders = orders.filter((o) => o.status === 'completed').length;

    return {
      totalDevices,
      totalUnits,
      totalValue,
      lowStockItems,
      totalOrders,
      pendingOrders,
      totalRevenue,
      completedOrders,
    };
  }, [inventory, orders]);

  // Generate recent activity from real data
  const recentActivity = useMemo(() => {
    const activities: Array<{
      action: string;
      device: string;
      time: string;
      type: string;
      timestamp: number;
    }> = [];

    // Add recent orders
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);

    recentOrders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - orderDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      let timeAgo = '';
      if (diffMins < 60) {
        timeAgo = `${diffMins}m ago`;
      } else if (diffHours < 24) {
        timeAgo = `${diffHours}h ago`;
      } else {
        timeAgo = `${diffDays}d ago`;
      }

      const items = Array.isArray(order.items) ? order.items : [];
      const firstItem = items[0];
      const deviceName = firstItem?.item?.deviceName || 'Multiple items';
      const itemsCount = items.length;
      activities.push({
        action: `New order ${order.status === 'pending' ? 'received' : order.status}`,
        device: deviceName + (itemsCount > 1 ? ` +${itemsCount - 1} more` : ''),
        time: timeAgo,
        type: 'order',
        timestamp: orderDate.getTime(),
      });
    });

    // Add low stock items
    const lowStockItems = inventory
      .filter((item) => getStockStatus(item.quantity) !== 'in-stock')
      .slice(0, 2);

    lowStockItems.forEach((item) => {
      activities.push({
        action: 'Low stock alert',
        device: item.deviceName,
        time: item.lastUpdated || 'Recently',
        type: 'alert',
        timestamp: Date.now() - 3600000, // 1 hour ago as fallback
      });
    });

    // Sort by timestamp and take most recent 5
    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
      .map(({ timestamp, ...rest }) => rest);
  }, [orders, inventory]);

  const topDevices = useMemo(() => {
    return inventory
      .sort((a, b) => b.quantity * b.pricePerUnit - a.quantity * a.pricePerUnit)
      .slice(0, 5);
  }, [inventory]);

  const isLoading = inventoryLoading || ordersLoading;

  if (isLoading) {
    return <Loader size="lg" text="Loading dashboard..." />;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto lg:overflow-hidden">
      <div className="space-y-6 flex-shrink-0 pb-6">
        {/* Page Header */}
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your inventory performance
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Devices"
            value={stats.totalDevices}
            icon={<Package className="h-5 w-5" />}
            accent="primary"
          />
          <StatCard
            title="Total Units"
            value={stats.totalUnits}
            icon={<TrendingUp className="h-5 w-5" />}
            accent="success"
          />
          <StatCard
            title="Inventory Value"
            value={formatPrice(stats.totalValue)}
            icon={<DollarSign className="h-5 w-5" />}
            accent="primary"
          />
          <StatCard
            title="Low Stock Alerts"
            value={stats.lowStockItems}
            icon={<AlertTriangle className="h-5 w-5" />}
            accent="warning"
          />
        </div>

        {/* Order Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={<ShoppingCart className="h-5 w-5" />}
            accent="primary"
          />
          <StatCard
            title="Pending Orders"
            value={stats.pendingOrders}
            icon={<Clock className="h-5 w-5" />}
            accent="warning"
          />
          <StatCard
            title="Total Revenue"
            value={formatPrice(stats.totalRevenue)}
            icon={<DollarSign className="h-5 w-5" />}
            accent="success"
          />
          <StatCard
            title="Completed Orders"
            value={stats.completedOrders}
            icon={<TrendingUp className="h-5 w-5" />}
            accent="success"
          />
        </div>
      </div>

      {/* Two Column Layout - Scrollable */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 mt-6 pb-6 lg:pb-0">
        {/* Recent Activity */}
        <div className="bg-card rounded-lg border border-border shadow-soft flex flex-col h-[300px] lg:h-auto lg:min-h-0">
          <div className="px-6 py-4 border-b border-border flex-shrink-0">
            <h3 className="font-semibold text-foreground">Recent Activity</h3>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="divide-y divide-border">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, idx) => (
                  <div key={idx} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{activity.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{activity.device}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Value Devices */}
        <div className="bg-card rounded-lg border border-border shadow-soft flex flex-col h-[300px] lg:h-auto lg:min-h-0">
          <div className="px-6 py-4 border-b border-border flex-shrink-0">
            <h3 className="font-semibold text-foreground">Top Value Devices</h3>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="divide-y divide-border">
              {topDevices.length > 0 ? (
                topDevices.map((device, idx) => (
                  <div key={device.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground w-5">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{device.deviceName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {device.quantity} units × {formatPrice(device.pricePerUnit)}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {formatPrice(device.quantity * device.pricePerUnit)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No devices available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
