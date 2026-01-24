'use client'

import { LogIn, LogOut, User, ShoppingCart, Package, Loader2, FileText, UserCircle } from "lucide-react";
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
import { useAuth } from "@/lib/auth/context";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { LoginModal } from "./LoginModal";
import { SignupModal } from "./SignupModal";
import { CartModal } from "./CartModal";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface UserNavbarProps {
  className?: string;
}

export const UserNavbar = ({ className }: UserNavbarProps) => {
  const { user, signOut } = useAuth();
  const { getUniqueItemsCount } = useCart();
  const router = useRouter();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Reset logout state when user logs in (user state changes from null to user)
  useEffect(() => {
    if (user) {
      setIsLoggingOut(false);
    }
  }, [user]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast.success('Logged out', {
        description: 'You have been successfully logged out.',
      });
      // Reset state before redirect to prevent stuck loader
      setIsLoggingOut(false);
      // Redirect to home page after successful logout
      router.push('/');
      router.refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to logout';
      toast.error('Logout failed', {
        description: errorMessage,
      });
      setIsLoggingOut(false);
    }
  };

  const isAuthenticated = !!user;

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
            <button
              onClick={() => router.push('/')}
              className="flex flex-col hover:opacity-80 transition-opacity cursor-pointer text-left"
              aria-label="Go to home page"
            >
              <h1 className="text-lg font-semibold text-foreground">Stoq</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Wholesale Stock Marketplace
              </p>
            </button>
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
                      <span className="hidden sm:inline">{user?.email?.split('@')[0] || 'User'}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.email?.split('@')[0] || 'User'}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => router.push('/user/profile')}
                      className="cursor-pointer"
                    >
                      <UserCircle className="h-4 w-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => router.push('/user/orders')}
                      className="cursor-pointer"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Orders
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout} 
                      disabled={isLoggingOut}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      {isLoggingOut ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Logging out...
                        </>
                      ) : (
                        <>
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSignupModalOpen(true)}
                  className="gap-2"
                >
                  <span className="hidden sm:inline">Sign Up</span>
                </Button>
                <Button onClick={() => setLoginModalOpen(true)} className="gap-2">
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Login</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      <LoginModal
        open={loginModalOpen}
        onOpenChange={(open) => {
          setLoginModalOpen(open)
          if (!open) {
            // Close signup modal if login modal is closed
            setSignupModalOpen(false)
          }
        }}
        onSignupClick={() => {
          setLoginModalOpen(false)
          setSignupModalOpen(true)
        }}
      />
      <SignupModal
        open={signupModalOpen}
        onOpenChange={(open) => {
          setSignupModalOpen(open)
          if (!open) {
            // Close login modal if signup modal is closed
            setLoginModalOpen(false)
          }
        }}
      />
      <CartModal open={cartModalOpen} onOpenChange={setCartModalOpen} />
    </>
  );
};

