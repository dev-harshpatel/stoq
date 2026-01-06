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
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/data/inventory";

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
  const { toast } = useToast();
  const { addToCart } = useCart();

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid quantity",
        variant: "destructive",
      });
      return;
    }
    if (quantity > item.quantity) {
      toast({
        title: "Insufficient stock",
        description: `Only ${item.quantity} units available`,
        variant: "destructive",
      });
      return;
    }
    
    // Add to cart
    addToCart(item, quantity);
    toast({
      title: "Added to cart",
      description: `${quantity} unit(s) of ${item.deviceName} added to cart`,
    });
    
    // Call onConfirm if provided (for backward compatibility)
    if (onConfirm) {
      onConfirm(item, quantity);
    }
    
    setQuantity(1);
    onOpenChange(false);
  };

  const totalPrice = item.pricePerUnit * quantity;

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
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={item.quantity}
              value={quantity}
              onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Maximum: {item.quantity} units
            </p>
          </div>
          <div className="space-y-2">
            <Label>Price per unit</Label>
            <p className="text-lg font-semibold text-foreground">
              {formatPrice(item.pricePerUnit)}
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
            <Button type="submit">Add to Cart</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

