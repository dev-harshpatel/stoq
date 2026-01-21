'use client'

import { useState } from 'react';
import { Bell, BellOff, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useInventory } from '@/contexts/InventoryContext';
import { getStockStatus, formatPrice } from '@/data/inventory';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  device?: string;
  time: string;
  read: boolean;
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'critical',
    title: 'Critical Stock Level',
    description: 'Quantity dropped below 2 units',
    device: 'Google Pixel 8 Pro',
    time: '1 hour ago',
    read: false,
  },
  {
    id: '2',
    type: 'critical',
    title: 'Critical Stock Level',
    description: 'Quantity dropped below 2 units',
    device: 'HMD Aura',
    time: '6 hours ago',
    read: false,
  },
  {
    id: '3',
    type: 'warning',
    title: 'Low Stock Warning',
    description: 'Quantity below 5 units',
    device: 'Google Pixel 7a',
    time: '30 minutes ago',
    read: false,
  },
  {
    id: '4',
    type: 'warning',
    title: 'Low Stock Warning',
    description: 'Quantity below 10 units',
    device: 'iPhone 13',
    time: '3 hours ago',
    read: true,
  },
  {
    id: '5',
    type: 'info',
    title: 'Price Change Detected',
    description: 'Price increased from $720 to $780',
    device: 'iPhone 14 Pro',
    time: '1 hour ago',
    read: true,
  },
  {
    id: '6',
    type: 'warning',
    title: 'Low Stock Warning',
    description: 'Quantity below 5 units',
    device: 'iPhone 14 Pro',
    time: '1 hour ago',
    read: true,
  },
];

const alertStyles = {
  critical: {
    bg: 'bg-destructive/5 border-destructive/20',
    icon: 'bg-destructive/10 text-destructive',
    badge: 'bg-destructive text-destructive-foreground',
  },
  warning: {
    bg: 'bg-warning/5 border-warning/20',
    icon: 'bg-warning/10 text-warning',
    badge: 'bg-warning text-warning-foreground',
  },
  info: {
    bg: 'bg-primary/5 border-primary/20',
    icon: 'bg-primary/10 text-primary',
    badge: 'bg-primary text-primary-foreground',
  },
};

export default function Alerts() {
  const [alerts, setAlerts] = useState(mockAlerts);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const filteredAlerts = showUnreadOnly ? alerts.filter((a) => !a.read) : alerts;
  const unreadCount = alerts.filter((a) => !a.read).length;

  const markAsRead = (id: string) => {
    setAlerts(alerts.map((a) => (a.id === id ? { ...a, read: true } : a)));
  };

  const markAllAsRead = () => {
    setAlerts(alerts.map((a) => ({ ...a, read: true })));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Alerts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount} unread notifications
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        </div>
      </div>

      {/* Alert Settings */}
      <div className="bg-card rounded-lg border border-border shadow-soft p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={showUnreadOnly}
                onCheckedChange={setShowUnreadOnly}
                id="unread-filter"
              />
              <label htmlFor="unread-filter" className="text-sm text-foreground cursor-pointer">
                Show unread only
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Email notifications</span>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-card rounded-lg border border-border">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
              <BellOff className="h-8 w-8 text-accent-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No alerts</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {showUnreadOnly
                ? "You're all caught up! No unread alerts."
                : 'No alerts to display at this time.'}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const styles = alertStyles[alert.type];
            return (
              <div
                key={alert.id}
                className={cn(
                  'p-4 rounded-lg border transition-colors',
                  styles.bg,
                  !alert.read && 'ring-1 ring-inset ring-primary/20'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn('p-2 rounded-lg flex-shrink-0', styles.icon)}>
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-foreground">{alert.title}</h4>
                          {!alert.read && (
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                        {alert.device && (
                          <p className="text-sm font-medium text-foreground mt-1">
                            {alert.device}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {alert.time}
                        </span>
                      </div>
                    </div>
                    {!alert.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-7 px-2 text-xs"
                        onClick={() => markAsRead(alert.id)}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
