'use client'

export const dynamic = 'force-dynamic'

import { UserLayout } from '@/components/UserLayout'
import { useState } from "react";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/lib/auth/context";
import { useOrders } from "@/contexts/OrdersContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useInventory } from "@/contexts/InventoryContext";
import { InventoryItem, formatPrice, getStockStatus } from "@/data/inventory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Trash2, ShoppingCart, Package, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { GradeBadge } from "@/components/GradeBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { PurchaseModal } from "@/components/PurchaseModal";
import { LoginModal } from "@/components/LoginModal";
import { useToast } from "@/hooks/use-toast";
import { getUserProfile } from "@/lib/supabase/utils";

export default function WishlistPage() {
  const { wishlistItems, removeFromWishlist, isLoading: wishlistLoading } = useWishlist();
  const { addToCart, cartItems } = useCart();
  const { user, loading: authLoading } = useAuth();
  const { createOrder, orders } = useOrders();
  const { profile } = useUserProfile();
  const { inventory } = useInventory();
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleBuyClick = (item: InventoryItem) => {
    const status = getStockStatus(item.quantity);
    if (status === 'out-of-stock') {
      toast({
        title: "Out of Stock",
        description: `${item.deviceName} is currently out of stock.`,
        variant: "destructive",
      });
      return;
    }
    setSelectedItem(item);
    setPurchaseModalOpen(true);
  };

  const handleAddAllToCart = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    // Check for out of stock items
    const outOfStockItems = wishlistItems.filter(item => {
      const latestItem = inventory.find(inv => inv.id === item.id);
      return !latestItem || latestItem.quantity === 0;
    });

    if (outOfStockItems.length > 0) {
      toast({
        title: "Some items are out of stock",
        description: `${outOfStockItems.map(i => i.deviceName).join(', ')} ${outOfStockItems.length === 1 ? 'is' : 'are'} out of stock and cannot be added.`,
        variant: "destructive",
      });
      return;
    }

    // Add available items to cart (1 each)
    let addedCount = 0;
    for (const item of wishlistItems) {
      const latestItem = inventory.find(inv => inv.id === item.id);
      if (latestItem && latestItem.quantity > 0) {
        // Check if already in cart
        const existingCartItem = cartItems.find(ci => ci.item.id === item.id);
        if (!existingCartItem) {
          addToCart(latestItem, 1);
          addedCount++;
        }
      }
    }

    if (addedCount > 0) {
      toast({
        title: "Added to cart",
        description: `${addedCount} item(s) added to cart.`,
      });
    } else {
      toast({
        title: "Items already in cart",
        description: "All wishlist items are already in your cart.",
      });
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    // Check if profile is approved
    if (profile && profile.approvalStatus !== 'approved') {
      toast({
        title: "Profile not approved",
        description: "Your profile must be approved before placing orders.",
        variant: "destructive",
      });
      return;
    }

    // Filter out out-of-stock items and check latest quantities
    const availableItems: { item: InventoryItem; quantity: number }[] = [];
    const outOfStockItems: string[] = [];

    for (const wishlistItem of wishlistItems) {
      // Get the latest inventory data
      const latestItem = inventory.find(inv => inv.id === wishlistItem.id);

      if (!latestItem || latestItem.quantity === 0) {
        outOfStockItems.push(wishlistItem.deviceName);
      } else {
        availableItems.push({ item: latestItem, quantity: 1 });
      }
    }

    if (outOfStockItems.length > 0) {
      toast({
        title: "Oops! You missed by a second",
        description: `${outOfStockItems.join(', ')} ${outOfStockItems.length === 1 ? 'is' : 'are'} now out of stock. Please remove ${outOfStockItems.length === 1 ? 'it' : 'them'} from your wishlist.`,
        variant: "destructive",
      });
      return;
    }

    if (availableItems.length === 0) {
      toast({
        title: "No items to checkout",
        description: "Your wishlist is empty or all items are out of stock.",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingOut(true);
    try {
      // Get user's tax info
      const userProfile = await getUserProfile(user.id);
      let taxRate = 0;
      let taxAmount = 0;

      if (userProfile?.businessCountry && userProfile?.businessState) {
        const { getTaxInfo, calculateTax } = await import('@/lib/taxUtils');
        const taxInfo = await getTaxInfo(
          userProfile.businessCountry,
          userProfile.businessState,
          userProfile.businessCity
        );
        const subtotal = availableItems.reduce((sum, item) => sum + item.item.sellingPrice * item.quantity, 0);
        taxRate = taxInfo.taxRatePercent / 100;
        taxAmount = calculateTax(subtotal, taxInfo.taxRate);
      }

      const subtotal = availableItems.reduce((sum, item) => sum + item.item.pricePerUnit * item.quantity, 0);

      const order = await createOrder(
        user.id,
        availableItems,
        subtotal,
        taxRate > 0 ? taxRate : undefined,
        taxAmount > 0 ? taxAmount : undefined
      );

      toast({
        title: "Order placed successfully",
        description: `Order #${order.id.slice(-8)} has been submitted.`,
      });

    } catch (error) {
      toast({
        title: "Error creating order",
        description: error instanceof Error ? error.message : "Failed to create order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Show loading state
  if (authLoading || wishlistLoading) {
    return (
      <UserLayout>
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Heart className="h-12 w-12 text-muted-foreground mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading wishlist...</p>
        </div>
      </UserLayout>
    );
  }

  // Calculate totals for available items
  const availableItems = wishlistItems.filter(item => {
    const latestItem = inventory.find(inv => inv.id === item.id);
    return latestItem && latestItem.quantity > 0;
  });
  const subtotal = availableItems.reduce((sum, item) => {
    const latestItem = inventory.find(inv => inv.id === item.id);
    return sum + (latestItem?.sellingPrice || item.sellingPrice);
  }, 0);

  return (
    <UserLayout>
      <div className="flex flex-col h-full">
        {/* Sticky Header Section */}
        <div className="sticky top-0 z-10 bg-background pb-4 space-y-4 border-b border-border mb-4 -mx-4 lg:-mx-6 px-4 lg:px-6 pt-4 lg:pt-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <Heart className="h-6 w-6 text-destructive" />
                My Wishlist
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {wishlistItems.length} item(s) saved
              </p>
            </div>
            {wishlistItems.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleAddAllToCart}
                  disabled={availableItems.length === 0}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add All to Cart
                </Button>
                <Button
                  onClick={handleCheckout}
                  disabled={availableItems.length === 0 || isCheckingOut}
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Checkout ({availableItems.length})</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0 -mx-4 lg:-mx-6 px-4 lg:px-6">
          {wishlistItems.length === 0 ? (
            <EmptyState
              title="Your wishlist is empty"
              description="Save items you love by clicking the heart icon on products."
            />
          ) : (
            <div className="space-y-4">
              {/* Wishlist Items */}
              <div className="grid gap-4">
                {wishlistItems.map((item) => {
                  // Get latest inventory data
                  const latestItem = inventory.find(inv => inv.id === item.id);
                  const currentQuantity = latestItem?.quantity ?? item.quantity;
                  const currentPrice = latestItem?.sellingPrice ?? item.sellingPrice;
                  const status = getStockStatus(currentQuantity);
                  const isOutOfStock = status === 'out-of-stock';

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-card rounded-lg border border-border",
                        isOutOfStock && "bg-muted/50 opacity-75"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <h4 className={cn(
                              "font-medium",
                              isOutOfStock ? "text-muted-foreground" : "text-foreground"
                            )}>
                              {item.deviceName}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.brand}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <GradeBadge grade={item.grade} />
                              <Badge variant="outline" className="text-xs">
                                {item.storage}
                              </Badge>
                              <StatusBadge quantity={currentQuantity} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="text-right flex-1 sm:flex-initial">
                          <p className={cn(
                            "text-lg font-semibold",
                            isOutOfStock ? "text-muted-foreground" : "text-foreground"
                          )}>
                            {formatPrice(currentPrice)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {currentQuantity} available
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isOutOfStock ? (
                            <div className="flex items-center gap-2 text-destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-sm font-medium">Out of Stock</span>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleBuyClick(latestItem || item)}
                              className="gap-2"
                            >
                              <ShoppingCart className="h-4 w-4" />
                              Buy
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeFromWishlist(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              {wishlistItems.length > 0 && (
                <div className="border-t border-border pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Subtotal ({availableItems.length} available item{availableItems.length !== 1 ? 's' : ''}):
                    </span>
                    <span className="text-xl font-bold text-primary">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                  {wishlistItems.length !== availableItems.length && (
                    <p className="text-sm text-destructive mt-2">
                      {wishlistItems.length - availableItems.length} item(s) are out of stock
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <PurchaseModal
        open={purchaseModalOpen}
        onOpenChange={setPurchaseModalOpen}
        item={selectedItem}
      />

      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
      />
    </UserLayout>
  );
}
