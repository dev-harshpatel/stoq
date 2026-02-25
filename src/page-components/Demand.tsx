"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { formatDateInOntario } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GradeBadge } from "@/components/GradeBadge";
import { Loader } from "@/components/Loader";
import { EmptyState } from "@/components/EmptyState";
import { AddProductModal } from "@/components/AddProductModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquare,
  Package,
  PackagePlus,
  Send,
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

/* ─── Preset notification messages ──────────────────────────────────── */

const PRESET_MESSAGES = [
  {
    key: "back_in_stock",
    label: "Back in stock",
    template: (item: string) =>
      `Great news! ${item} is back in stock — grab yours before it sells out.`,
  },
  {
    key: "ready_to_order",
    label: "Ready to order",
    template: (item: string) =>
      `We've just restocked ${item}. Your requested item is ready to order.`,
  },
  {
    key: "available_now",
    label: "Available now",
    template: (item: string) =>
      `${item} is now available. Order now to secure your units.`,
  },
  {
    key: "limited_stock",
    label: "Limited stock alert",
    template: (_item: string) =>
      `Your waitlisted item is back! Be quick — stock is limited.`,
  },
  {
    key: "custom",
    label: "Write a custom message…",
    template: () => "",
  },
];

/* ─── Component ──────────────────────────────────────────────────────── */

export default function Demand() {
  const [rawRequests, setRawRequests] = useState<RawRequest[]>([]);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Fulfill message dialog
  const [messageDialogGroup, setMessageDialogGroup] =
    useState<DemandGroup | null>(null);
  const [selectedPreset, setSelectedPreset] = useState("back_in_stock");
  const [customMessage, setCustomMessage] = useState("");
  const [isFulfilling, setIsFulfilling] = useState(false);

  // Restock required dialog
  const [restockDialogGroup, setRestockDialogGroup] =
    useState<DemandGroup | null>(null);

  // AddProductModal for restock
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [addProductItemId, setAddProductItemId] = useState<
    string | undefined
  >();
  // After restock, open message dialog for the same group
  const [pendingFulfillGroup, setPendingFulfillGroup] =
    useState<DemandGroup | null>(null);

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

  /**
   * Entry point when admin clicks "Fulfill Order".
   * If item is out of stock → prompt restock first.
   * If item is in stock → open message composer.
   */
  const handleFulfillClick = (group: DemandGroup) => {
    if (group.currentStock === 0) {
      setRestockDialogGroup(group);
    } else {
      openMessageDialog(group);
    }
  };

  const openMessageDialog = (group: DemandGroup) => {
    setMessageDialogGroup(group);
    setSelectedPreset("back_in_stock");
    setCustomMessage("");
  };

  /** Compose the final message to send */
  const resolveMessage = (group: DemandGroup): string => {
    const itemLabel = `${group.deviceName} ${group.storage} (Grade ${group.grade})`;
    if (selectedPreset === "custom") {
      return customMessage.trim();
    }
    const preset = PRESET_MESSAGES.find((p) => p.key === selectedPreset);
    return preset ? preset.template(itemLabel) : "";
  };

  /** Final confirmation: mark all requests fulfilled + save admin message */
  const confirmFulfill = async () => {
    if (!messageDialogGroup) return;
    const message = resolveMessage(messageDialogGroup);
    if (!message) {
      toast.error("Please write or select a message for your customers.");
      return;
    }

    setIsFulfilling(true);
    try {
      const { error } = await (supabase.from("stock_requests") as any)
        .update({
          status: "fulfilled",
          admin_message: message,
          fulfilled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in(
          "id",
          messageDialogGroup.requests.map((r) => r.id)
        );

      if (error) throw error;

      const count = messageDialogGroup.requests.length;
      toast.success(
        `${count} customer${count !== 1 ? "s" : ""} notified — ${messageDialogGroup.deviceName} marked as restocked`
      );
      setMessageDialogGroup(null);
      setPendingFulfillGroup(null);
      await loadRequests();
    } catch {
      toast.error("Failed to notify customers. Please try again.");
    } finally {
      setIsFulfilling(false);
    }
  };

  /** Admin chose to restock from the restock-required dialog */
  const handleRestockNow = (group: DemandGroup) => {
    setPendingFulfillGroup(group);
    setRestockDialogGroup(null);
    setAddProductItemId(group.inventoryItemId);
    setAddProductOpen(true);
  };

  /** After AddProductModal restocks the item, auto-open the message dialog */
  const handleRestockComplete = () => {
    setAddProductOpen(false);
    if (pendingFulfillGroup) {
      // Reload so currentStock updates, then open message dialog
      loadRequests().then(() => {
        openMessageDialog(pendingFulfillGroup);
      });
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
                        {group.currentStock === 0 && (
                          <span className="ml-2 text-destructive font-medium">
                            · Needs restocking
                          </span>
                        )}
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

                      {/* ── Fulfill action ── */}
                      <div className="px-5 py-3 bg-muted/30 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">
                            Restock this item and notify all waiting customers
                            with a message.
                          </p>
                          {group.currentStock === 0 && (
                            <p className="text-xs text-destructive font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Item is currently out of stock
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleFulfillClick(group)}
                          className="gap-2 flex-shrink-0"
                        >
                          {group.currentStock === 0 ? (
                            <PackagePlus className="h-3.5 w-3.5" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          {group.currentStock === 0
                            ? "Restock & Notify"
                            : "Fulfill Order"}
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

      {/* ── Restock Required Dialog ── */}
      <Dialog
        open={!!restockDialogGroup}
        onOpenChange={(open) => !open && setRestockDialogGroup(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 shrink-0">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              Item Out of Stock
            </DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">
                {restockDialogGroup?.deviceName} {restockDialogGroup?.storage}{" "}
                (Grade {restockDialogGroup?.grade})
              </span>{" "}
              currently has{" "}
              <span className="font-semibold text-destructive">0 units</span>.
              You need to restock it before notifying customers.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-300">
            <p className="font-medium">Recommended flow:</p>
            <ol className="mt-1 space-y-1 list-decimal list-inside text-xs">
              <li>Restock the item using the Add Product form</li>
              <li>
                Write a message to notify the{" "}
                {restockDialogGroup?.requests.length} waiting customer
                {restockDialogGroup?.requests.length !== 1 ? "s" : ""}
              </li>
            </ol>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setRestockDialogGroup(null);
                if (restockDialogGroup) openMessageDialog(restockDialogGroup);
              }}
            >
              <Bell className="h-3.5 w-3.5 mr-1.5" />
              Notify Anyway
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() =>
                restockDialogGroup && handleRestockNow(restockDialogGroup)
              }
            >
              <PackagePlus className="h-3.5 w-3.5" />
              Restock Item First
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Fulfillment Message Dialog ── */}
      <Dialog
        open={!!messageDialogGroup}
        onOpenChange={(open) => !open && setMessageDialogGroup(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Send className="h-4 w-4 text-primary" />
              </div>
              Notify Waiting Customers
            </DialogTitle>
            <DialogDescription>
              Send a message to all{" "}
              <span className="font-semibold text-foreground">
                {messageDialogGroup?.requests.length} customer
                {messageDialogGroup?.requests.length !== 1 ? "s" : ""}
              </span>{" "}
              waiting for{" "}
              <span className="font-semibold text-foreground">
                {messageDialogGroup?.deviceName} {messageDialogGroup?.storage}{" "}
                (Grade {messageDialogGroup?.grade})
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Preset selector */}
            <div className="space-y-2">
              <Label htmlFor="preset-select">Message template</Label>
              <Select
                value={selectedPreset}
                onValueChange={(val) => {
                  setSelectedPreset(val);
                  if (val !== "custom") setCustomMessage("");
                }}
              >
                <SelectTrigger id="preset-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_MESSAGES.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message preview / custom input */}
            {selectedPreset !== "custom" ? (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Preview</Label>
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground leading-relaxed">
                  {messageDialogGroup &&
                    PRESET_MESSAGES.find(
                      (p) => p.key === selectedPreset
                    )?.template(
                      `${messageDialogGroup.deviceName} ${messageDialogGroup.storage} (Grade ${messageDialogGroup.grade})`
                    )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="custom-msg">Your message</Label>
                <Textarea
                  id="custom-msg"
                  placeholder="e.g. We have restocked this item in limited quantity. Order now!"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="min-h-[90px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {customMessage.length}/500 characters
                </p>
              </div>
            )}

            {/* Customer count reminder */}
            <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <p className="text-xs text-muted-foreground">
                This will mark{" "}
                <span className="font-semibold text-foreground">
                  {messageDialogGroup?.requests.length} request
                  {messageDialogGroup?.requests.length !== 1 ? "s" : ""}
                </span>{" "}
                as fulfilled and customers will see your message in real-time.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setMessageDialogGroup(null)}
              disabled={isFulfilling}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmFulfill}
              disabled={
                isFulfilling ||
                (selectedPreset === "custom" && !customMessage.trim())
              }
              className="gap-2"
            >
              {isFulfilling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Send & Mark Fulfilled
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AddProductModal (triggered from Restock flow) ── */}
      <AddProductModal
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        onSuccess={() => {}}
        initialItemId={addProductItemId}
        onRestockComplete={handleRestockComplete}
      />
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
