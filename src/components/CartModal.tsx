import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/contexts/OrdersContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/data/inventory";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CartModal = ({ open, onOpenChange }: CartModalProps) => {
  const { cartItems, removeFromCart, updateQuantity, clearCart, getTotalPrice } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { createOrder } = useOrders();
  const { toast } = useToast();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please login to checkout",
        variant: "destructive",
      });
      return;
    }

    if (cartItems.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add items to cart before checkout",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "User information not found",
        variant: "destructive",
      });
      return;
    }

    // Create order
    const orderItems = cartItems.map((cartItem) => ({
      item: cartItem.item,
      quantity: cartItem.quantity,
    }));

    const order = createOrder(user.username, user.username, orderItems);

    toast({
      title: "Order placed successfully",
      description: `Order #${order.id.slice(-8)} has been submitted. Admin will contact you soon.`,
    });

    clearCart();
    onOpenChange(false);
  };

  const totalPrice = getTotalPrice();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Shopping Cart</DialogTitle>
          <DialogDescription>
            Review your items before checkout
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Your cart is empty</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add items from the products page
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((cartItem) => (
                <div
                  key={cartItem.item.id}
                  className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border border-border"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">
                      {cartItem.item.deviceName}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        Grade {cartItem.item.grade}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {cartItem.item.storage}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatPrice(cartItem.item.pricePerUnit)} each
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(cartItem.item.id, cartItem.quantity - 1)
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        max={cartItem.item.quantity}
                        value={cartItem.quantity}
                        onChange={(e) => {
                          const newQuantity = Number.parseInt(e.target.value) || 1;
                          if (newQuantity <= cartItem.item.quantity) {
                            updateQuantity(cartItem.item.id, newQuantity);
                          }
                        }}
                        className="w-16 text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(cartItem.item.id, cartItem.quantity + 1)
                        }
                        disabled={cartItem.quantity >= cartItem.item.quantity}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="text-right min-w-[100px]">
                      <p className="font-semibold text-foreground">
                        {formatPrice(cartItem.item.pricePerUnit * cartItem.quantity)}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeFromCart(cartItem.item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="border-t border-border pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-foreground">Total:</span>
              <span className="text-2xl font-bold text-primary">
                {formatPrice(totalPrice)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={clearCart}
                className="flex-1"
                disabled={cartItems.length === 0}
              >
                Clear Cart
              </Button>
              <Button
                onClick={handleCheckout}
                className="flex-1"
                disabled={cartItems.length === 0}
              >
                Checkout
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

