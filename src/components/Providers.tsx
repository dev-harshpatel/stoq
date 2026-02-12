"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth/context";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { InventoryProvider } from "@/contexts/InventoryContext";
import { OrdersProvider } from "@/contexts/OrdersContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { NavigationIndicator } from "@/components/NavigationIndicator";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <RealtimeProvider>
            <NavigationProvider>
              <UserProfileProvider>
                <InventoryProvider>
                  <CartProvider>
                    <WishlistProvider>
                      <OrdersProvider>
                        {children}
                        <NavigationIndicator />
                        <Toaster />
                        <Sonner />
                      </OrdersProvider>
                    </WishlistProvider>
                  </CartProvider>
                </InventoryProvider>
              </UserProfileProvider>
            </NavigationProvider>
          </RealtimeProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
