"use client";

import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/lib/auth/context";
import { useOrders, OrderAddresses } from "@/contexts/OrdersContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { getAvailableQuantityForUser } from "@/lib/orderUtils";
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
import { useState, useEffect, useCallback } from "react";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatPrice } from "@/data/inventory";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LoginModal } from "@/components/LoginModal";
import { fetchLatestPricesForItems } from "@/lib/supabase/queries";
import {
  PriceChangeWarningDialog,
  PriceChange,
} from "@/components/PriceChangeWarningDialog";
import { calculateTax } from "@/lib/taxUtils";
import {
  CheckoutAddressSection,
  SelectedAddresses,
} from "@/components/CheckoutAddressSection";

interface CartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CartModal = ({ open, onOpenChange }: CartModalProps) => {
  const { profile } = useUserProfile();
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    updateItemPrice,
    clearCart,
    getSubtotal,
    getTaxAmount,
    getTotalWithTax,
    taxRatePercent,
    taxAmount,
    taxType,
    isTaxLoading,
  } = useCart();
  const { user } = useAuth();
  const { createOrder, orders } = useOrders();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPriceWarning, setShowPriceWarning] = useState(false);
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([]);
  const [selectedAddresses, setSelectedAddresses] =
    useState<SelectedAddresses | null>(null);
  const [showAddressErrors, setShowAddressErrors] = useState(false);

  const isAuthenticated = !!user;
  const hasBusinessLocation: boolean | null = user?.id
    ? Boolean(profile?.businessCountry && profile?.businessState)
    : null;

  // Handle address selection changes
  const handleAddressChange = useCallback((addresses: SelectedAddresses) => {
    setSelectedAddresses(addresses);
    // Clear error state when user selects addresses
    if (
      addresses.shipping.selection !== "none" &&
      addresses.billing.selection !== "none"
    ) {
      setShowAddressErrors(false);
    }
  }, []);

  const handleCheckout = async () => {
    if (!isAuthenticated || !user) {
      // Show login modal instead of just a toast
      setShowLoginModal(true);
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

    // Check if user profile is approved
    if (profile && profile.approvalStatus !== "approved") {
      toast({
        title: "Profile not approved",
        description:
          "Your profile must be approved before placing orders. Please wait for admin approval.",
        variant: "destructive",
      });
      return;
    }

    // Check if addresses are selected
    if (
      !selectedAddresses ||
      selectedAddresses.shipping.selection === "none" ||
      selectedAddresses.billing.selection === "none"
    ) {
      setShowAddressErrors(true);
      toast({
        title: "Addresses required",
        description:
          "Please select shipping and billing addresses before checkout.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Fetch latest prices from database
      const itemIds = cartItems.map((cartItem) => cartItem.item.id);
      const latestPrices = await fetchLatestPricesForItems(itemIds);

      // Check for price changes and stock availability
      const outOfStockItems: string[] = [];
      const insufficientStockItems: {
        name: string;
        requested: number;
        available: number;
      }[] = [];
      const detectedPriceChanges: PriceChange[] = [];

      for (const cartItem of cartItems) {
        const latestItem = latestPrices.find((p) => p.id === cartItem.item.id);

        if (!latestItem || latestItem.quantity === 0) {
          outOfStockItems.push(cartItem.item.deviceName);
        } else {
          if (latestItem.quantity < cartItem.quantity) {
            insufficientStockItems.push({
              name: cartItem.item.deviceName,
              requested: cartItem.quantity,
              available: latestItem.quantity,
            });
          }

          // Check for price changes
          if (latestItem.sellingPrice !== cartItem.item.sellingPrice) {
            detectedPriceChanges.push({
              itemId: cartItem.item.id,
              deviceName: cartItem.item.deviceName,
              storage: cartItem.item.storage,
              grade: cartItem.item.grade,
              oldPrice: cartItem.item.sellingPrice,
              newPrice: latestItem.sellingPrice,
              quantity: cartItem.quantity,
            });
          }
        }
      }

      if (outOfStockItems.length > 0) {
        toast({
          title: "Oops! You missed by a second",
          description: `${outOfStockItems.join(", ")} ${outOfStockItems.length === 1 ? "is" : "are"} now out of stock. Please remove ${outOfStockItems.length === 1 ? "it" : "them"} from your cart.`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (insufficientStockItems.length > 0) {
        const itemDetails = insufficientStockItems
          .map(
            (item) =>
              `${item.name} (requested: ${item.requested}, available: ${item.available})`,
          )
          .join(", ");
        toast({
          title: "Oops! Stock changed",
          description: `Some items have less stock than requested: ${itemDetails}. Please adjust quantities.`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // If there are price changes, show warning dialog
      if (detectedPriceChanges.length > 0) {
        setPriceChanges(detectedPriceChanges);
        setShowPriceWarning(true);
        setIsLoading(false);
        return;
      }

      // No price changes, proceed with order
      await proceedWithOrder();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to verify prices. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const proceedWithOrder = async (priceOverrides?: Map<string, number>) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Create order items, applying price overrides if provided
      const orderItems = cartItems.map((cartItem) => {
        const newPrice = priceOverrides?.get(cartItem.item.id);
        const itemWithUpdatedPrice =
          newPrice !== undefined
            ? { ...cartItem.item, sellingPrice: newPrice }
            : cartItem.item;

        return {
          item: itemWithUpdatedPrice,
          quantity: cartItem.quantity,
        };
      });

      // Calculate subtotal with updated prices
      const orderSubtotal = orderItems.reduce(
        (total, orderItem) =>
          total + orderItem.item.sellingPrice * orderItem.quantity,
        0,
      );

      // Recalculate tax based on new subtotal if prices were overridden
      const taxRateDecimal = taxRatePercent > 0 ? taxRatePercent / 100 : 0;
      const recalculatedTaxAmount =
        priceOverrides && priceOverrides.size > 0
          ? calculateTax(orderSubtotal, taxRateDecimal)
          : taxAmount;

      // Build addresses object from selectedAddresses
      const orderAddresses: OrderAddresses | undefined = selectedAddresses
        ? {
            shippingAddress: selectedAddresses.shipping.address,
            billingAddress: selectedAddresses.billing.address,
          }
        : undefined;

      // Include tax information and addresses in order
      const order = await createOrder(
        user.id,
        orderItems,
        orderSubtotal,
        taxRateDecimal > 0 ? taxRateDecimal : undefined,
        recalculatedTaxAmount > 0 ? recalculatedTaxAmount : undefined,
        orderAddresses,
      );

      toast({
        title: "Order placed successfully",
        description: `Order #${order.id.slice(-8)} has been submitted. Admin will contact you soon.`,
      });

      clearCart();
      onOpenChange(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create order. Please try again.";
      toast({
        title: "Error creating order",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePriceChangeConfirm = async () => {
    // Prevent double-click by checking if already loading
    if (isLoading) return;

    setIsLoading(true);

    try {
      // Re-verify prices one more time before placing order
      const itemIds = cartItems.map((cartItem) => cartItem.item.id);
      const latestPrices = await fetchLatestPricesForItems(itemIds);

      // Check if prices changed again since the warning was shown
      const pricesChangedAgain: PriceChange[] = [];
      for (const change of priceChanges) {
        const currentPrice = latestPrices.find((p) => p.id === change.itemId);
        if (currentPrice && currentPrice.sellingPrice !== change.newPrice) {
          pricesChangedAgain.push({
            ...change,
            oldPrice: change.newPrice, // The price user agreed to
            newPrice: currentPrice.sellingPrice, // The new current price
          });
        }
      }

      // If prices changed again, update the warning dialog
      if (pricesChangedAgain.length > 0) {
        setPriceChanges(pricesChangedAgain);
        setIsLoading(false);
        toast({
          title: "Prices changed again",
          description: "Please review the updated prices before continuing.",
          variant: "destructive",
        });
        return;
      }

      // Create a map of item IDs to new prices (from the original price changes)
      const priceOverrides = new Map<string, number>();
      for (const change of priceChanges) {
        priceOverrides.set(change.itemId, change.newPrice);
        // Also update the cart for display purposes
        updateItemPrice(change.itemId, change.newPrice);
      }

      setShowPriceWarning(false);
      setPriceChanges([]);

      // Proceed with order, passing the price overrides directly
      await proceedWithOrder(priceOverrides);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to verify prices. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handlePriceChangeCancel = () => {
    setShowPriceWarning(false);
    setPriceChanges([]);
  };

  const subtotal = getSubtotal();
  const totalWithTax = getTotalWithTax();
  const showTaxBreakdown =
    isAuthenticated && hasBusinessLocation && subtotal > 0;

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
                        {formatPrice(cartItem.item.sellingPrice)} each
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
                          updateQuantity(
                            cartItem.item.id,
                            cartItem.quantity - 1,
                          )
                        }
                        disabled={cartItem.quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        value={cartItem.quantity}
                        onChange={(e) => {
                          const newQuantity =
                            Number.parseInt(e.target.value) || 1;
                          // The updateQuantity function will validate against available quantity
                          // (accounting for pending orders)
                          updateQuantity(cartItem.item.id, newQuantity);
                        }}
                        className="w-16 text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(
                            cartItem.item.id,
                            cartItem.quantity + 1,
                          )
                        }
                        disabled={(() => {
                          // Calculate available quantity accounting for:
                          // - Total inventory
                          // - Items already in cart (including current item)
                          // - Items in pending orders
                          const availableQuantity = getAvailableQuantityForUser(
                            cartItem.item,
                            user?.id || null,
                            orders || [],
                            cartItems,
                          );
                          // Disable if we can't add one more (current quantity + 1 would exceed available)
                          // availableQuantity already accounts for current cart quantity
                          // So if availableQuantity is 0, we can't add more
                          return availableQuantity <= 0;
                        })()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="text-right min-w-[100px]">
                      <p className="font-semibold text-foreground">
                        {formatPrice(
                          cartItem.item.sellingPrice * cartItem.quantity,
                        )}
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

        {/* Address Selection - Only show when authenticated and cart has items */}
        {isAuthenticated && cartItems.length > 0 && (
          <CheckoutAddressSection
            profile={profile}
            onAddressChange={handleAddressChange}
            showErrors={showAddressErrors}
          />
        )}

        {cartItems.length > 0 && (
          <div className="border-t border-border pt-4 space-y-4">
            {/* Tax Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium text-foreground">
                  {formatPrice(subtotal)}
                </span>
              </div>

              {isAuthenticated && !hasBusinessLocation && (
                <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-md border border-border">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Please complete your business profile with state and city to
                    calculate tax.
                  </p>
                </div>
              )}

              {showTaxBreakdown && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {taxType} ({taxRatePercent.toFixed(2)}%):
                  </span>
                  <span className="font-medium text-foreground">
                    {isTaxLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin inline" />
                    ) : (
                      formatPrice(taxAmount)
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-lg font-semibold text-foreground">
                Total:
              </span>
              <span className="text-2xl font-bold text-primary">
                {showTaxBreakdown && !isTaxLoading
                  ? formatPrice(totalWithTax)
                  : formatPrice(subtotal)}
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
                disabled={cartItems.length === 0 || isLoading}
              >
                {isLoading ? "Processing..." : "Checkout"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Login Modal */}
      <LoginModal
        open={showLoginModal}
        onOpenChange={(open) => {
          setShowLoginModal(open);
          // If login is successful and modal closes, try checkout again
          if (!open && isAuthenticated && cartItems.length > 0) {
            // Small delay to ensure auth state is updated
            setTimeout(() => {
              handleCheckout();
            }, 100);
          }
        }}
      />

      {/* Price Change Warning Dialog */}
      <PriceChangeWarningDialog
        open={showPriceWarning}
        onOpenChange={setShowPriceWarning}
        priceChanges={priceChanges}
        onConfirm={handlePriceChangeConfirm}
        onCancel={handlePriceChangeCancel}
        isLoading={isLoading}
      />
    </Dialog>
  );
};
