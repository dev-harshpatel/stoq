import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { UserLayout } from "@/components/UserLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { InventoryProvider } from "@/contexts/InventoryContext";
import { OrdersProvider } from "@/contexts/OrdersContext";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import Alerts from "./pages/Alerts";
import ProductManagement from "./pages/ProductManagement";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import UserProducts from "./pages/UserProducts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <InventoryProvider>
            <OrdersProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
          <Routes>
            {/* User Routes */}
            <Route
              path="/"
              element={
                <UserLayout>
                  <UserProducts />
                </UserLayout>
              }
            />
            <Route
              path="/user"
              element={
                <UserLayout>
                  <UserProducts />
                </UserLayout>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={<Navigate to="/admin/dashboard" replace />}
            />
            <Route
              path="/admin/dashboard"
              element={
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              }
            />
            <Route
              path="/admin/inventory"
              element={
                <AppLayout>
                  <Inventory />
                </AppLayout>
              }
            />
            <Route
              path="/admin/products"
              element={
                <AppLayout>
                  <ProductManagement />
                </AppLayout>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AppLayout>
                  <Orders />
                </AppLayout>
              }
            />
            <Route
              path="/admin/alerts"
              element={
                <AppLayout>
                  <Alerts />
                </AppLayout>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <AppLayout>
                  <Reports />
                </AppLayout>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AppLayout>
                  <Settings />
                </AppLayout>
              }
            />

            {/* Legacy routes redirect to admin */}
            <Route path="/inventory" element={<Navigate to="/admin/inventory" replace />} />
            <Route path="/alerts" element={<Navigate to="/admin/alerts" replace />} />
            <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />
            <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
          </OrdersProvider>
          </InventoryProvider>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
