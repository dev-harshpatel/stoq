import { RefreshCw, Menu, User, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth/context';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavbarProps {
  onMenuClick: () => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (value: boolean) => void;
  lastRefreshed: string;
  onRefresh?: () => void;
  className?: string;
}

export function Navbar({
  onMenuClick,
  autoRefresh,
  onAutoRefreshChange,
  lastRefreshed,
  onRefresh,
  className,
}: NavbarProps) {
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
      router.push('/');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to logout';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsLoggingOut(false);
    }
  };

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'AD';
  };

  const getUserEmail = () => {
    return user?.email || 'Admin';
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-foreground">Stoq</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Wholesale Stock Dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 lg:gap-6">
          <div className="hidden md:flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Last refreshed:</span>
            <span className="text-foreground font-medium">{lastRefreshed}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Auto-refresh</span>
            <Switch
              checked={autoRefresh}
              onCheckedChange={onAutoRefreshChange}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden sm:flex"
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs font-medium">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{getUserEmail()}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile?.role === 'admin' ? 'Administrator' : 'User'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Logging out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
