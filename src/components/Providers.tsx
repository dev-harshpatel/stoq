'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/lib/auth/context'
import { UserProfileProvider } from '@/contexts/UserProfileContext'
import { CartProvider } from '@/contexts/CartContext'
import { InventoryProvider } from '@/contexts/InventoryContext'
import { OrdersProvider } from '@/contexts/OrdersContext'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <UserProfileProvider>
            <InventoryProvider>
              <CartProvider>
                <OrdersProvider>
                  {children}
                  <Toaster />
                  <Sonner />
                </OrdersProvider>
              </CartProvider>
            </InventoryProvider>
          </UserProfileProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

