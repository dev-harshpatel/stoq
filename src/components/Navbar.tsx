import { RefreshCw, Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onMenuClick: () => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (value: boolean) => void;
  lastRefreshed: string;
  className?: string;
}

export function Navbar({
  onMenuClick,
  autoRefresh,
  onAutoRefreshChange,
  lastRefreshed,
  className,
}: NavbarProps) {
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
            <h1 className="text-lg font-semibold text-foreground">Live Inventory</h1>
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

          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback className="bg-accent text-accent-foreground text-xs font-medium">
              AD
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
