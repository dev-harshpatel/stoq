"use client";

import { useState } from "react";
import { InventoryItem } from "@/data/inventory";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TOAST_MESSAGES } from "@/lib/constants/toast-messages";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/lib/auth/context";
import { getAvailableQuantityForUser } from "@/lib/utils/order";
import { formatPrice } from "@/lib/utils";
import { useContext } from "react";
import { OrdersContext } from "@/contexts/OrdersContext";

interface PurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  onConfirm?: (item: InventoryItem, quantity: number) => void;
}

export const PurchaseModal = ({
  open,
  onOpenChange,
  item,
  onConfirm,
}: PurchaseModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const { addToCart, cartItems } = useCart();
  const { user } = useAuth();

  // Safely get orders - may not be available in all contexts
  // Use useContext directly to avoid throwing error if not available
  const ordersContext = useContext(OrdersContext);
  const orders = ordersContext?.orders || [];

  if (!item) return null;

  // Calculate available quantity accounting for:
  // - Items in cart
  // - Items in pending orders (for logged-in users)
  const availableQuantity = getAvailableQuantityForUser(
    item,
    user?.id || null,
    orders,
    cartItems
  );

  // Get current quantity of this item in cart
  const existingCartItem = cartItems.find(
    (cartItem) => cartItem.item.id === item.id
  );
  const existingCartQuantity = existingCartItem?.quantity || 0;

  // Get quantity in pending orders (for display)
  const pendingOrdersQuantity = user?.id
    ? orders
        .filter(
          (order) => order.userId === user.id && order.status === "pending"
        )
        .reduce((total, order) => {
          if (!Array.isArray(order.items)) return total;
          const orderItem = order.items.find((oi) => oi.item?.id === item.id);
          return total + (orderItem?.quantity || 0);
        }, 0)
    : 0;

  const maxQuantity = Math.max(0, availableQuantity);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      toast.error(TOAST_MESSAGES.PURCHASE_INVALID_QUANTITY);
      return;
    }

    // Check if adding this quantity would exceed available stock
    // availableQuantity already accounts for items in cart and pending orders
    // So we just need to check if quantity exceeds availableQuantity
    if (quantity > availableQuantity) {
      const reason =
        pendingOrdersQuantity > 0
          ? `You have ${pendingOrdersQuantity} unit(s) in pending orders and ${existingCartQuantity} in your cart.`
          : existingCartQuantity > 0
          ? `You already have ${existingCartQuantity} in your cart.`
          : "";

      toast.error(
        TOAST_MESSAGES.PURCHASE_INSUFFICIENT_STOCK(availableQuantity, reason)
      );
      return;
    }

    // Add to cart
    addToCart(item, quantity);
    toast.success(TOAST_MESSAGES.CART_ADDED(quantity, item.deviceName));

    // Call onConfirm if provided (for backward compatibility)
    if (onConfirm) {
      onConfirm(item, quantity);
    }

    setQuantity(1);
    onOpenChange(false);
  };

  const totalPrice = item.sellingPrice * quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Cart</DialogTitle>
          <DialogDescription>
            Select quantity for {item.deviceName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Device</Label>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium text-foreground">{item.deviceName}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Grade: {item.grade} | Storage: {item.storage}
              </p>
              <p className="text-sm text-muted-foreground">
                Available: {item.quantity} units
                {(existingCartQuantity > 0 || pendingOrdersQuantity > 0) && (
                  <span className="ml-2 text-primary">
                    ({existingCartQuantity} in cart
                    {pendingOrdersQuantity > 0 &&
                      `, ${pendingOrdersQuantity} in pending orders`}
                    )
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={maxQuantity}
              value={quantity || ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setQuantity(0);
                  return;
                }
                const newQuantity = Number.parseInt(val);
                if (!isNaN(newQuantity)) {
                  setQuantity(Math.min(newQuantity, maxQuantity));
                }
              }}
              onBlur={() => {
                if (quantity < 1) setQuantity(1);
              }}
              required
              disabled={maxQuantity === 0}
            />
            <p className="text-xs text-muted-foreground">
              {maxQuantity === 0 ? (
                <span className="text-destructive">
                  No more units available
                  {pendingOrdersQuantity > 0 &&
                    " (you have pending orders for this item)"}
                </span>
              ) : existingCartQuantity > 0 || pendingOrdersQuantity > 0 ? (
                <>
                  {existingCartQuantity > 0 &&
                    `You have ${existingCartQuantity} in cart. `}
                  {pendingOrdersQuantity > 0 &&
                    `You have ${pendingOrdersQuantity} in pending orders. `}
                  Maximum: {maxQuantity} more unit(s) available.
                </>
              ) : (
                <>Maximum: {item.quantity} units</>
              )}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Price per unit</Label>
            <p className="text-lg font-semibold text-foreground">
              {formatPrice(item.sellingPrice)}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Total Price</Label>
            <p className="text-2xl font-bold text-primary">
              {formatPrice(totalPrice)}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuantity(1);
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={maxQuantity === 0}>
              Add to Cart
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
