import { LogIn, LogOut, User, ShoppingCart, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { LoginModal } from "./LoginModal";
import { CartModal } from "./CartModal";
import { UserOrders } from "./UserOrders";
import { useState } from "react";

interface UserNavbarProps {
  className?: string;
}

export const UserNavbar = ({ className }: UserNavbarProps) => {
  const { isAuthenticated, user, logout } = useAuth();
  const { getUniqueItemsCount } = useCart();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const cartItemCount = getUniqueItemsCount();

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-sm",
          className
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-foreground">Stoq</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Wholesale Stock Marketplace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setCartModalOpen(true)}
              className="relative gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartItemCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {cartItemCount > 99 ? "99+" : cartItemCount}
                </Badge>
              )}
            </Button>

            {isAuthenticated ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">{user?.username}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-96 p-0">
                    <DropdownMenuLabel className="px-4 py-3">My Orders</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="p-4">
                      <UserOrders />
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer mx-2 mb-2">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button onClick={() => setLoginModalOpen(true)} className="gap-2">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Login</span>
              </Button>
            )}
          </div>
        </div>
      </header>
      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
      <CartModal open={cartModalOpen} onOpenChange={setCartModalOpen} />
    </>
  );
};

