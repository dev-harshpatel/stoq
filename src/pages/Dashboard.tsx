import { useMemo } from 'react';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { inventoryData, getStockStatus, formatPrice } from '@/data/inventory';
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
  const stats = useMemo(() => {
    const totalDevices = inventoryData.length;
    const totalUnits = inventoryData.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = inventoryData.reduce(
      (sum, item) => sum + item.quantity * item.pricePerUnit,
      0
    );
    const lowStockItems = inventoryData.filter(
      (item) => getStockStatus(item.quantity) !== 'in-stock'
    ).length;

    return { totalDevices, totalUnits, totalValue, lowStockItems };
  }, []);

  const recentActivity = [
    { action: 'Stock updated', device: 'Google Pixel 7a', time: '30m ago', type: 'update' },
    { action: 'Low stock alert', device: 'Google Pixel 8 Pro', time: '1h ago', type: 'alert' },
    { action: 'Price changed', device: 'iPhone 14 Pro', time: '1h ago', type: 'price' },
    { action: 'New device added', device: 'HMD Aura', time: '6h ago', type: 'new' },
    { action: 'Stock updated', device: 'Samsung Galaxy S23', time: '4h ago', type: 'update' },
  ];

  const topDevices = inventoryData
    .sort((a, b) => b.quantity * b.pricePerUnit - a.quantity * a.pricePerUnit)
    .slice(0, 5);

  return (
    <div className="space-y-6">
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
          change={{ value: '+2', positive: true }}
          icon={<Package className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          title="Total Units"
          value={stats.totalUnits}
          change={{ value: '+12', positive: true }}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          title="Inventory Value"
          value={formatPrice(stats.totalValue)}
          change={{ value: '+$2,450', positive: true }}
          icon={<DollarSign className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats.lowStockItems}
          change={{ value: '+3', positive: false }}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="warning"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-card rounded-lg border border-border shadow-soft">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Recent Activity</h3>
          </div>
          <div className="divide-y divide-border">
            {recentActivity.map((activity, idx) => (
              <div key={idx} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{activity.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{activity.device}</p>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Value Devices */}
        <div className="bg-card rounded-lg border border-border shadow-soft">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Top Value Devices</h3>
          </div>
          <div className="divide-y divide-border">
            {topDevices.map((device, idx) => (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
