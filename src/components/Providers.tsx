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
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";
import { useState } from "react";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
}

function RealtimeInvalidationBridge() {
  useRealtimeInvalidation();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <RealtimeProvider>
            <RealtimeInvalidationBridge />
            <NavigationProvider>
              <UserProfileProvider>
                <InventoryProvider>
                  <CartProvider>
                    <WishlistProvider>
                      <OrdersProvider>
                        {children}
                        <NavigationIndicator />
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
