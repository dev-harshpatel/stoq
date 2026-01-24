'use client'

import { LogIn, LogOut, User, ShoppingCart, Package, Loader2, FileText, UserCircle, BookOpen, Mail, Menu, X } from "lucide-react";
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
import { NavLink } from "./NavLink";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

interface UserNavbarProps {
  className?: string;
}

export const UserNavbar = ({ className }: UserNavbarProps) => {
  const { user, signOut } = useAuth();
  const { getUniqueItemsCount } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          {/* Logo */}
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

          {/* Desktop Navigation and Actions */}
          <div className="hidden md:flex items-center gap-4">
            {/* Navigation Links */}
            <nav className="flex items-center gap-6">
              <NavLink
                href="/user/grades"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2",
                  pathname === "/user/grades" ? "text-primary" : "text-muted-foreground"
                )}
                activeClassName="text-primary"
              >
                <BookOpen className="h-4 w-4" />
                Grades Guide
              </NavLink>
              <NavLink
                href="/contact"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2",
                  pathname === "/contact" ? "text-primary" : "text-muted-foreground"
                )}
                activeClassName="text-primary"
              >
                <Mail className="h-4 w-4" />
                Contact Us
              </NavLink>
            </nav>

            {/* Cart Button */}
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

            {/* User Menu or Auth Buttons */}
            {isAuthenticated ? (
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
                  <DropdownMenuItem 
                    onClick={() => router.push('/user/grades')}
                    className="cursor-pointer"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Product Grades Guide
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
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSignupModalOpen(true)}
                  className="gap-1.5 text-xs sm:text-sm"
                  size="sm"
                >
                  <UserCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Sign Up</span>
                </Button>
                <Button 
                  onClick={() => setLoginModalOpen(true)} 
                  className="gap-1.5 text-xs sm:text-sm"
                  size="sm"
                >
                  <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Login</span>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button - Only visible on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[9998] transition-opacity duration-200"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Navigation Menu - Slide-in Drawer */}
      <div
        className={cn(
          "md:hidden fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-card border-r border-border shadow-lg overflow-y-auto z-[9999] transition-transform duration-300 ease-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Menu</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
              className="h-8 w-8"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Menu Content */}
          <nav className="flex flex-col p-4 space-y-1 flex-1">
            {/* Navigation Links */}
            <button
              onClick={() => {
                router.push('/user/grades');
                setMobileMenuOpen(false);
              }}
              className={cn(
                "text-sm font-medium transition-colors flex items-center gap-2 px-3 py-2.5 rounded-lg text-left",
                pathname === "/user/grades" 
                  ? "text-primary bg-primary/10" 
                  : "text-foreground hover:bg-muted"
              )}
            >
              <BookOpen className="h-4 w-4" />
              Grades Guide
            </button>
            <button
              onClick={() => {
                router.push('/contact');
                setMobileMenuOpen(false);
              }}
              className={cn(
                "text-sm font-medium transition-colors flex items-center gap-2 px-3 py-2.5 rounded-lg text-left",
                pathname === "/contact" 
                  ? "text-primary bg-primary/10" 
                  : "text-foreground hover:bg-muted"
              )}
            >
              <Mail className="h-4 w-4" />
              Contact Us
            </button>

            {/* Cart Button */}
            <button
              onClick={() => {
                setCartModalOpen(true);
                setMobileMenuOpen(false);
              }}
              className="text-sm font-medium transition-colors flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-foreground hover:bg-muted relative"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Cart</span>
              {cartItemCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {cartItemCount > 99 ? "99+" : cartItemCount}
                </Badge>
              )}
            </button>

            {/* Divider */}
            <div className="border-t border-border my-2" />

            {/* Authenticated User Menu */}
            {isAuthenticated ? (
              <>
                <div className="px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Account</p>
                  <p className="text-sm font-medium text-foreground mt-1">{user?.email?.split('@')[0] || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    router.push('/user/profile');
                    setMobileMenuOpen(false);
                  }}
                  className="text-sm font-medium transition-colors flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-foreground hover:bg-muted"
                >
                  <UserCircle className="h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    router.push('/user/orders');
                    setMobileMenuOpen(false);
                  }}
                  className="text-sm font-medium transition-colors flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-foreground hover:bg-muted"
                >
                  <FileText className="h-4 w-4" />
                  View Orders
                </button>
                <div className="border-t border-border my-2" />
                <button
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await handleLogout();
                  }}
                  disabled={isLoggingOut}
                  className="text-sm font-medium transition-colors flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Logging out...
                    </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4" />
                      Logout
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setSignupModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="text-sm font-medium transition-colors flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-foreground hover:bg-muted"
                >
                  <UserCircle className="h-4 w-4" />
                  Sign Up
                </button>
                <button
                  onClick={() => {
                    setLoginModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="text-sm font-medium transition-colors flex items-center gap-2 px-3 py-2.5 rounded-lg text-left bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
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

