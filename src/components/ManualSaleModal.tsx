"use client";

import { useState, useMemo } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { useOrders } from "@/contexts/OrdersContext";
import { useAuth } from "@/lib/auth/context";
import { InventoryItem } from "@/data/inventory";
import { OrderItem } from "@/types/order";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GradeBadge } from "@/components/GradeBadge";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Loader2,
  Minus,
  Plus,
  Search,
  ShoppingBag,
} from "lucide-react";

const MANUAL_PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "EMT", label: "E-Transfer (EMT)" },
  { value: "WIRE", label: "Wire Transfer" },
  { value: "CHQ", label: "Cheque" },
  { value: "CREDIT", label: "Credit Card" },
  { value: "NET 15", label: "Net 15" },
  { value: "NET 30", label: "Net 30" },
];

interface SelectedItem {
  item: InventoryItem;
  quantity: number;
}

interface ManualSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualSaleModal({ open, onOpenChange }: ManualSaleModalProps) {
  const { inventory, decreaseQuantity } = useInventory();
  const { createManualOrder } = useOrders();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<
    Record<string, SelectedItem>
  >({});

  // Step 2 fields
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableItems = useMemo(
    () =>
      inventory.filter(
        (item) =>
          item.isActive !== false &&
          item.quantity > 0 &&
          (searchQuery === "" ||
            item.deviceName
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.storage.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [inventory, searchQuery]
  );

  const selectedItemsList = Object.values(selectedItems);
  const subtotal = selectedItemsList.reduce(
    (sum, { item, quantity }) =>
      sum + (item.sellingPrice ?? item.pricePerUnit) * quantity,
    0
  );

  const handleToggleItem = (item: InventoryItem) => {
    setSelectedItems((prev) => {
      if (prev[item.id]) {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }
      return { ...prev, [item.id]: { item, quantity: 1 } };
    });
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    setSelectedItems((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      const newQty = Math.max(
        1,
        Math.min(current.item.quantity, current.quantity + delta)
      );
      return { ...prev, [itemId]: { ...current, quantity: newQty } };
    });
  };

  const handleClose = () => {
    setStep(1);
    setSearchQuery("");
    setSelectedItems({});
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setPaymentMethod("");
    setNotes("");
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (
      !user?.id ||
      selectedItemsList.length === 0 ||
      !customerName.trim() ||
      !paymentMethod
    )
      return;

    setIsSubmitting(true);
    try {
      const orderItems: OrderItem[] = selectedItemsList.map(
        ({ item, quantity }) => ({ item, quantity })
      );

      const order = await createManualOrder(
        user.id,
        orderItems,
        {
          name: customerName.trim(),
          email: customerEmail.trim() || undefined,
          phone: customerPhone.trim() || undefined,
        },
        paymentMethod,
        notes.trim() || undefined
      );

      // Decrement inventory since the sale is already approved
      await Promise.all(
        orderItems.map(({ item, quantity }) =>
          decreaseQuantity(item.id, quantity)
        )
      );

      toast.success(
        `Sale recorded — Order #${order.id.slice(-8).toUpperCase()}`
      );
      handleClose();
    } catch {
      toast.error("Failed to record sale. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Record Manual Sale
          </DialogTitle>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mt-3">
            <div
              className={cn(
                "flex items-center gap-2 text-xs font-medium",
                step === 1 ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                  step === 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > 1 ? <Check className="h-3 w-3" /> : "1"}
              </div>
              Select Items
            </div>
            <div className="flex-1 h-px bg-border" />
            <div
              className={cn(
                "flex items-center gap-2 text-xs font-medium",
                step === 2 ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                  step === 2
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                2
              </div>
              Customer & Payment
            </div>
          </div>
        </DialogHeader>

        {/* ── STEP 1: Select Items ─────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col flex-1 min-h-0 px-6 py-4 gap-4">
            {/* Search */}
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by device, brand, or storage..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2 -mx-1 px-1">
              {availableItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">
                  No items available in inventory.
                </p>
              ) : (
                availableItems.map((item) => {
                  const isSelected = !!selectedItems[item.id];
                  const selected = selectedItems[item.id];
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleItem(item)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors select-none",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div
                          className={cn(
                            "mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-muted-foreground"
                          )}
                        >
                          {isSelected && (
                            <Check className="h-2.5 w-2.5 text-primary-foreground" />
                          )}
                        </div>

                        {/* Item info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm text-foreground">
                              {item.deviceName}
                            </p>
                            <GradeBadge grade={item.grade} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.brand} • {item.storage}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} in stock
                          </p>
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-sm text-foreground">
                            {formatPrice(item.sellingPrice ?? item.pricePerUnit)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            per unit
                          </p>
                        </div>
                      </div>

                      {/* Quantity selector — shown when selected */}
                      {isSelected && (
                        <div
                          className="mt-3 flex items-center gap-3 pt-3 border-t border-primary/20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-xs text-muted-foreground">
                            Qty:
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() =>
                                handleQuantityChange(item.id, -1)
                              }
                              disabled={selected.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-6 text-center">
                              {selected.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleQuantityChange(item.id, 1)}
                              disabled={selected.quantity >= item.quantity}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-xs text-muted-foreground ml-auto">
                            ={" "}
                            {formatPrice(
                              (item.sellingPrice ?? item.pricePerUnit) *
                                selected.quantity
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-border pt-4 flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {selectedItemsList.length > 0 ? (
                  <span className="font-medium text-foreground">
                    {selectedItemsList.length} item(s) —{" "}
                    {formatPrice(subtotal)}
                  </span>
                ) : (
                  "No items selected"
                )}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  disabled={selectedItemsList.length === 0}
                  onClick={() => setStep(2)}
                >
                  Next: Customer Details →
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Customer & Payment ───────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col flex-1 min-h-0 px-6 py-4 gap-4">
            <div className="flex-1 overflow-y-auto min-h-0 space-y-5">
              {/* Customer info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Customer Information
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="customerName">
                      Customer Name{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="customerName"
                      placeholder="e.g. John Doe or ABC Electronics"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="customerEmail">
                        Email{" "}
                        <span className="text-xs text-muted-foreground">
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        placeholder="email@example.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="customerPhone">
                        Phone{" "}
                        <span className="text-xs text-muted-foreground">
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="customerPhone"
                        type="tel"
                        placeholder="+1 (416) 555-0000"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div className="space-y-1.5">
                <Label>
                  Payment Method{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {MANUAL_PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="saleNotes">
                  Notes{" "}
                  <span className="text-xs text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="saleNotes"
                  placeholder="Any additional details about this sale..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[70px] resize-none"
                />
              </div>

              {/* Order summary */}
              <div className="bg-muted/50 rounded-lg border border-border p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Order Summary
                </h3>
                <div className="space-y-1.5">
                  {selectedItemsList.map(({ item, quantity }) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {item.deviceName} {item.storage} × {quantity}
                      </span>
                      <span className="font-medium text-foreground">
                        {formatPrice(
                          (item.sellingPrice ?? item.pricePerUnit) * quantity
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">
                    {formatPrice(subtotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-border pt-4 flex items-center justify-between gap-4">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                disabled={
                  !customerName.trim() || !paymentMethod || isSubmitting
                }
                onClick={handleSubmit}
                className="gap-2"
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Record Sale
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
