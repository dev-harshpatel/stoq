"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { formatDateInOntario } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GradeBadge } from "@/components/GradeBadge";
import { Loader } from "@/components/Loader";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquare,
  Package,
  TrendingUp,
  Users,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface RawRequest {
  id: string;
  user_id: string;
  inventory_item_id: string;
  quantity: number;
  note: string | null;
  status: string;
  created_at: string;
  inventory: {
    id: string;
    device_name: string;
    brand: string;
    grade: string;
    storage: string;
    quantity: number;
  } | null;
}

interface RequestRow {
  id: string;
  userId: string;
  quantity: number;
  note: string | null;
  createdAt: string;
}

interface DemandGroup {
  inventoryItemId: string;
  deviceName: string;
  brand: string;
  grade: string;
  storage: string;
  currentStock: number;
  requests: RequestRow[];
  totalUnitsWanted: number;
}

/* ─── Component ──────────────────────────────────────────────────────── */

export default function Demand() {
  const [rawRequests, setRawRequests] = useState<RawRequest[]>([]);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [fulfillingItem, setFulfillingItem] = useState<string | null>(null);

  /* ── Data loading ── */
  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase.from("stock_requests") as any)
        .select(
          `id, user_id, inventory_item_id, quantity, note, status, created_at,
           inventory:inventory_item_id (id, device_name, brand, grade, storage, quantity)`
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const rows: RawRequest[] = data ?? [];
      setRawRequests(rows);

      // Fetch user emails
      const uniqueIds = [...new Set(rows.map((r) => r.user_id))];
      if (uniqueIds.length > 0) {
        const res = await fetch("/api/users/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: uniqueIds }),
        });
        if (res.ok) {
          const { emails } = await res.json();
          setUserEmails(emails);
        }
      }
    } catch {
      toast.error("Failed to load demand data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  /* ── Group by item, sorted by demand desc ── */
  const groups = useMemo<DemandGroup[]>(() => {
    const map = new Map<string, DemandGroup>();

    for (const req of rawRequests) {
      if (!req.inventory) continue;

      if (!map.has(req.inventory_item_id)) {
        map.set(req.inventory_item_id, {
          inventoryItemId: req.inventory_item_id,
          deviceName: req.inventory.device_name,
          brand: req.inventory.brand,
          grade: req.inventory.grade,
          storage: req.inventory.storage,
          currentStock: req.inventory.quantity,
          requests: [],
          totalUnitsWanted: 0,
        });
      }

      const g = map.get(req.inventory_item_id)!;
      g.requests.push({
        id: req.id,
        userId: req.user_id,
        quantity: req.quantity,
        note: req.note,
        createdAt: req.created_at,
      });
      g.totalUnitsWanted += req.quantity;
    }

    return Array.from(map.values()).sort(
      (a, b) => b.requests.length - a.requests.length
    );
  }, [rawRequests]);

  /* ── Summary stats ── */
  const totalRequests = rawRequests.length;
  const totalUnits = rawRequests.reduce((s, r) => s + r.quantity, 0);
  const uniqueCustomers = new Set(rawRequests.map((r) => r.user_id)).size;

  /* ── Actions ── */
  const toggleExpanded = (id: string) =>
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleFulfilGroup = async (group: DemandGroup) => {
    setFulfillingItem(group.inventoryItemId);
    try {
      const { error } = await (supabase.from("stock_requests") as any)
        .update({ status: "fulfilled", updated_at: new Date().toISOString() })
        .in(
          "id",
          group.requests.map((r) => r.id)
        );

      if (error) throw error;

      toast.success(
        `${group.requests.length} request${group.requests.length !== 1 ? "s" : ""} marked as fulfilled`
      );
      await loadRequests();
    } catch {
      toast.error("Failed to mark requests as fulfilled");
    } finally {
      setFulfillingItem(null);
    }
  };

  /* ── Render ── */
  if (isLoading) return <Loader text="Loading demand data..." />;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background pb-4 border-b border-border mb-4 -mx-4 lg:-mx-6 px-4 lg:px-6 pt-4 lg:pt-6">
        <h2 className="text-2xl font-semibold text-foreground">
          Stock Demand
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customer pre-block requests for out-of-stock items
        </p>
      </div>

      {totalRequests === 0 ? (
        <EmptyState
          title="No pending requests"
          description="When customers request out-of-stock items, they'll appear here so you know what to restock."
        />
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 -mx-4 lg:-mx-6 px-4 lg:px-6 space-y-5 pb-6">
          {/* ── Summary stats ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              icon={<Package className="h-5 w-5 text-primary" />}
              label="Pending Requests"
              value={totalRequests}
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-amber-500" />}
              label="Total Units Wanted"
              value={totalUnits}
              valueClassName="text-amber-600 dark:text-amber-400"
            />
            <StatCard
              icon={<Users className="h-5 w-5 text-blue-500" />}
              label="Customers Waiting"
              value={uniqueCustomers}
            />
          </div>

          {/* ── Demand groups ── */}
          <div className="space-y-3">
            {groups.map((group) => {
              const isExpanded = expandedItems.has(group.inventoryItemId);
              const isFulfilling = fulfillingItem === group.inventoryItemId;

              return (
                <div
                  key={group.inventoryItemId}
                  className="rounded-lg border border-border bg-card overflow-hidden"
                >
                  {/* ── Group header (tap to expand) ── */}
                  <button
                    className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-muted/40 transition-colors"
                    onClick={() => toggleExpanded(group.inventoryItemId)}
                  >
                    <span className="flex-shrink-0 text-muted-foreground mt-0.5">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </span>

                    {/* Item identity */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">
                          {group.deviceName}
                        </span>
                        <GradeBadge grade={group.grade as any} />
                        <span className="text-sm text-muted-foreground">
                          {group.storage}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          · {group.brand}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Current stock:{" "}
                        <span
                          className={cn(
                            "font-semibold",
                            group.currentStock === 0
                              ? "text-destructive"
                              : "text-warning"
                          )}
                        >
                          {group.currentStock} unit
                          {group.currentStock !== 1 ? "s" : ""}
                        </span>
                      </p>
                    </div>

                    {/* Demand counters */}
                    <div className="flex items-center gap-5 flex-shrink-0 text-right">
                      <div>
                        <p className="text-xs text-muted-foreground leading-none mb-1">
                          Customers
                        </p>
                        <p className="text-xl font-bold text-foreground tabular-nums">
                          {group.requests.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground leading-none mb-1">
                          Units
                        </p>
                        <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                          {group.totalUnitsWanted}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* ── Expanded: individual requests ── */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      <div className="divide-y divide-border">
                        {group.requests.map((req) => (
                          <div
                            key={req.id}
                            className="px-5 py-3 flex items-start gap-4"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {userEmails[req.userId] ||
                                  req.userId.slice(0, 8) + "…"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {req.quantity} unit
                                {req.quantity !== 1 ? "s" : ""} ·{" "}
                                {formatDateInOntario(req.createdAt)}
                              </p>
                              {req.note && (
                                <p className="flex items-start gap-1 text-xs text-muted-foreground mt-1 italic">
                                  <MessageSquare className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                  {req.note}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className="text-xs flex-shrink-0 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-400"
                            >
                              Pending
                            </Badge>
                          </div>
                        ))}
                      </div>

                      {/* ── Fulfil action ── */}
                      <div className="px-5 py-3 bg-muted/30 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                          Mark all as fulfilled once you've restocked this
                          item. Requests are removed from the demand list.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFulfilGroup(group)}
                          disabled={isFulfilling}
                          className="gap-2 flex-shrink-0"
                        >
                          {isFulfilling ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Mark All Fulfilled
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Stat card ─────────────────────────────────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-muted flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            "text-2xl font-bold text-foreground tabular-nums",
            valueClassName
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
