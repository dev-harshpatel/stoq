import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { UserLayout } from "@/components/UserLayout";
import { AuthProvider } from "@/lib/auth/context";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { CartProvider } from "@/contexts/CartContext";
import { InventoryProvider } from "@/contexts/InventoryContext";
import { OrdersProvider } from "@/contexts/OrdersContext";
import { AuthGuard } from "@/lib/auth/AuthGuard";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import Alerts from "./pages/Alerts";
import ProductManagement from "./pages/ProductManagement";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import UserProducts from "./pages/UserProducts";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <UserProfileProvider>
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

            {/* Admin Login */}
            <Route
              path="/admin/login"
              element={<AdminLogin />}
            />

            {/* Admin Routes - Protected */}
            <Route
              path="/admin"
              element={
                <AuthGuard requireAuth={true} redirectTo="/admin/login">
                  <Navigate to="/admin/dashboard" replace />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <AuthGuard requireAuth={true} redirectTo="/admin/login">
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </AuthGuard>
              }
            />
            <Route
              path="/admin/inventory"
              element={
                <AuthGuard requireAuth={true} redirectTo="/admin/login">
                  <AppLayout>
                    <Inventory />
                  </AppLayout>
                </AuthGuard>
              }
            />
            <Route
              path="/admin/products"
              element={
                <AuthGuard requireAuth={true} redirectTo="/admin/login">
                  <AppLayout>
                    <ProductManagement />
                  </AppLayout>
                </AuthGuard>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AuthGuard requireAuth={true} redirectTo="/admin/login">
                  <AppLayout>
                    <Orders />
                  </AppLayout>
                </AuthGuard>
              }
            />
            <Route
              path="/admin/alerts"
              element={
                <AuthGuard requireAuth={true} redirectTo="/admin/login">
                  <AppLayout>
                    <Alerts />
                  </AppLayout>
                </AuthGuard>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <AuthGuard requireAuth={true} redirectTo="/admin/login">
                  <AppLayout>
                    <Reports />
                  </AppLayout>
                </AuthGuard>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AuthGuard requireAuth={true} redirectTo="/admin/login">
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </AuthGuard>
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
        </UserProfileProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
